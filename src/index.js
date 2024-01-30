
const { Client, Intents, MessageEmbed, MessageAttachment } = require("discord.js");
const client = new Client({
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
	],
	partials: ["MESSAGE", "REACTION", "USER"],
});
const { token } = require("../config.json");

const snipes = {};
const editSnipes = {};
const reactionSnipes = {};

const formatEmoji = (emoji) => {
	return !emoji.id || emoji.available
		? emoji.toString() // bot has access or unicode emoji
		: `[:${emoji.name}:](${emoji.url})`; // bot cannot use the emoji
};

client.on("ready", () => {
	console.log(`[sniper] :: Logged in as ${client.user.tag}.`);
});

client.on("messageDelete", async (message) => {
	if (message.partial || (message.embeds.length && !message.content)) return; // content is >

	snipes[message.channel.id] = {
		author: message.author,
		content: message.content,
		createdAt: message.createdTimestamp,
		images: message.attachments ? message.attachments : null,
		link: message.url
	};
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
	if (oldMessage.partial) return; // content is null

	editSnipes[oldMessage.channel.id] = {
		author: oldMessage.author,
		content: oldMessage.content,
		createdAt: newMessage.editedTimestamp,
	};
});

client.on("messageReactionRemove", async (reaction, user) => {
	if (reaction.partial) reaction = await reaction.fetch();

	reactionSnipes[reaction.message.channel.id] = {
		user: user,
		emoji: reaction.emoji,
		messageURL: reaction.message.url,
		createdAt: Date.now(),
	};
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return;

	const channel =
		interaction.options.getChannel("channel") || interaction.channel;

	if (interaction.commandName === "snipe") {
		const snipe = snipes[channel.id];
		if (!snipe) return interaction.reply("There's nothing to snipe!");

		const embed = new MessageEmbed()
			.setAuthor(snipe.author.tag)
			.setFooter(`#${channel.name}`)
			.setTimestamp(snipe.createdAt)
			.setDescription(snipe.content ? snipe.content : " ")
			.setURL(snipe.link);

		const embeds = [];
		embeds.push(embed);

		if (snipe.images) {
			for (const ma of snipe.images.values()) {
				embeds.push(new MessageEmbed()
					.setURL(snipe.link)
					.setImage(ma.url ? ma.url : ma.proxyURL))
			}
		}

		// if (snipe.content) {
		// 	embed.setDescription(snipe.content)
		// 	if (snipe.content.includes("https://") && snipe.content.includes(".gif")) {
		// 		const link = snipe.content.slice(snipe.content.indexOf("https://"), snipe.content.indexOf(".gif") + 4);
		// 		if (!link.includes(" "))
		// 			embed.setImage(url);
		// 	} else if (snipe.content.startsWith("https://tenor.com/")) {

		// 	}
		// }

		await interaction.reply({ embeds: [embeds] });
	} else if (interaction.commandName === "editsnipe") {
		const snipe = editSnipes[channel.id];
		if (!snipe) return interaction.reply("There's nothing to snipe!");

		const embed = new MessageEmbed()
			.setDescription(snipe.content)
			.setAuthor(snipe.author.tag)
			.setFooter(`#${channel.name}`)
			.setTimestamp(snipe.createdAt);

		await interaction.reply({ embeds: [embed] });
	} else if (interaction.commandName === "reactionsnipe") {
		const snipe = reactionSnipes[channel.id];
		if (!snipe) return interaction.reply("There's nothing to snipe!");

		const embed = new MessageEmbed()
			.setDescription(
				`reacted with ${formatEmoji(
					snipe.emoji
				)} on [this message](${snipe.messageURL})`
			)
			.setAuthor(snipe.user.tag)
			.setFooter(`#${channel.name}`)
			.setTimestamp(snipe.createdAt);

		if (snipe.emoji.id && !snipe.emoji.available) {
			const emojiImage = snipe.emoji.url;
			if (emojiImage != null)
				embed.setImage(emojiImage);
		}

		await interaction.reply({ embeds: [embed] });
	}
});

client.login(token);
