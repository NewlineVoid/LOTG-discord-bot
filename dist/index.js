import { Client, Collection, GatewayIntentBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
client.commands = new Collection();
const commandsPath = path.join(process.cwd(), 'dist', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    import(`file://${filePath}`).then((cmd) => {
        client.commands.set(cmd.data.name, cmd);
    });
}
const eventsPath = path.join(process.cwd(), 'dist', 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    import(`file://${filePath}`).then((event) => {
        if (event.default.once)
            client.once(event.default.name, (...args) => event.default.execute(...args));
        else
            client.on(event.default.name, (...args) => event.default.execute(...args));
    });
}
client.login(process.env.BOT_TOKEN);
