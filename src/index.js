
const { Client, Intents, MessageEmbed, MessageAttachment } = require("discord.js");
const client = new Client({
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
	],
	partials: ["MESSAGE", "REACTION", "USER"],
});
const token = require("../config.json");
const fetch = require("node-fetch");

const snipes = {};
const editSnipes = {};
const reactionSnipes = {};

const urlREGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)\/\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)\.gif/g
const tenorREGEX = /https?:\/\/(www\.)?tenor\.com\/view\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)\/\b([-a-zA-Z0-9()@:%_\+~#?&//=]*)\b/g

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

		const embeds = [], images = [];

		if (snipe.images)
			for (const ma of snipe.images.values())
				images.push(ma.url ? ma.url : ma.proxyURL);

		if (snipe.content) {
			const s = snipe.content;
			if (s.includes("https://") && s.includes(".gif")) {
				const embeddedURL = s.slice(s.indexOf("https://"), s.indexOf(".gif") + 4);
				if (embeddedURL.match(urlREGEX).length > 0) {
					images.push(embeddedURL);
				}
			} else if (s.includes("https://tenor.com/view/") && s.match(tenorREGEX).length > 0) {
				const firstMatch = s.match(tenorREGEX)[0].trim();
				if (firstMatch.startsWith("https://tenor.com/view/")) {
					console.log(firstMatch.slice(23))
					fetch(`https://tenor.googleapis.com/v2/search?q=${firstMatch.slice(23)}&key=${token.tenor_token}&limit=1`)
						.then((result) => (result.json()).then(result => {
							console.log(result);
							console.log(result["results"][0]["url"])
						}).catch(e => {
							console.error(e);
						})
				}
			}
		}

		const embed = new MessageEmbed()
			.setAuthor(snipe.author.username)
			.setFooter(`#${channel.name}`)
			.setTimestamp(snipe.createdAt)
			.setDescription(snipe.content)
			.setImage(images.length > 0 ? images[0] : null)
			.setURL(snipe.link);

		embeds.push(embed);

		if (images.length > 0) {
			let first = true;
			for (const imgURL of images) {
				if (first) {
					first = false;
					continue;
				}
				embeds.push(new MessageEmbed()
					.setURL(snipe.link)
					.setImage(imgURL));
			}
		}

		await interaction.reply({ embeds: embeds });
	} else if (interaction.commandName === "editsnipe") {
		const snipe = editSnipes[channel.id];
		if (!snipe) return interaction.reply("There's nothing to snipe!");

		const embed = new MessageEmbed()
			.setDescription(snipe.content)
			.setAuthor(snipe.author.username)
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
			.setAuthor(snipe.user.username)
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

client.login(token.token);
