// importiamo le librerie
import fetch from 'node-fetch';
import pkg from 'discord.js';
import { createAudioPlayer, createAudioResource, joinVoiceChannel } from '@discordjs/voice';
const { Discord, Client, VoiceChannel, MessageEmbed, GatewayIntentBits } = pkg
//const { Discord, Client, VoiceChannel } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ],
    partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});
import SpotifyWebApi from 'spotify-web-api-node';
//const SpotifyWebApi = require('spotify-web-api-node');
import express from 'express'

// definiamo i parametri di configurazione del bot e del client Spotify
const config = {
    prefix: '!', // prefisso per i comandi del bot
    token: 'DISCORD_TOKEN',
    spotifyClientId: 'SPOTIFY_CLIENT_ID',
    spotifyClientSecret: 'SPOTIFY_SECRET_CLIENT',
    spotifyRedirectUri: 'http://localhost:8080/callback', // redirect URI that must be the same on spotify
};
const app = express()
const port = 8080
const serverName = 'Spotify Server'

// istanziamo il client Spotify e il client Discord
const spotifyApi = new SpotifyWebApi({
    clientId: config.spotifyClientId,
    clientSecret: config.spotifyClientSecret,
    redirectUri: config.spotifyRedirectUri,
});
//Running Server
app.get('/', (req, res) => {
    res.send(`<h1>App Running Correctly on ${serverName}<h1>`)
})

app.get('/callback', async (req, res) => {
    const code = req.query.code || null;
    const error = req.query.error || null;
  
    // Handle the callback response based on the authorization code or error
    if (error) {
      console.error(`Spotify API authentication error: ${error}`);
      res.status(401).send(`Authentication failed: ${error}`);
    } else if (code) {
      console.log(`Spotify API authentication successful with code: ${code}`);
      res.send(`Authentication successful! Your authorization code is: ${code}`);
      await spotifyAuthentication(code)
    } else {
      res.redirect('/');
    }
});

app.listen(port, () => {
    console.log(`App Listening on port: ${port}`)
})

// funzione di autenticazione con Spotify
async function spotifyAuthentication(code) {
    return spotifyApi.authorizationCodeGrant(code).then(data => {
        // impostiamo il token di accesso per le successive richieste alle API di Spotify
        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.setRefreshToken(data.body['refresh_token']);

        return data.body;
    });
}

// evento di avvio del bot
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// evento di messaggio ricevuto
client.on('messageCreate', async message => {
    // se il messaggio non inizia con il prefisso del bot o è stato inviato da un altro bot, ignoriamo
    if (!message.content.startsWith(config.prefix) || message.author.bot) {
        return;
    }

    // rimuoviamo il prefisso e dividiamo il messaggio in argomenti
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // gestiamo il comando !spotify-auth
    if (command === 'spotify-auth') {
        // generiamo l'URL per l'autenticazione con Spotify
        const authorizeUrl = spotifyApi.createAuthorizeURL(['user-read-private', 'user-read-email', 'playlist-read-private'], '');

        // inviamo un messaggio all'utente con il link per l'autenticazione
        message.channel.send(`Clicca qui per autenticarti con Spotify: ${authorizeUrl}`);
        //message.channel.send('Authenticate!')
    }
    if(command === 'job'){
        const voice =  message.member.voice.channel
        const connection = joinVoiceChannel({
            channelId: message.member.voice.channel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator
        })
    }
    // gestiamo il comando !spotify-playlist
    if (command === 'spotify-playlist') {
        // se l'utente non è autenticato con Spotify, inviamo un messaggio di errore
        if (!spotifyApi.getAccessToken()) {
            message.channel.send('Devi prima autenticarti con Spotify. Usa il comando !spotify-auth.');
            return;
        }
        try {
            // recuperiamo l'ID della playlist dall'argomento del comando
            const playlistId = args[0];
            //console.log(playlistId)

            // recuperiamo le informazioni sulla playlist tramite l'API di Spotify
            const playlist = await spotifyApi.getPlaylist(playlistId)

            // recuperiamo i brani della playlist tramite l'API di Spotify
            const tracks = await spotifyApi.getPlaylistTracks(playlistId)
            //console.log(tracks)

                // creiamo un array di URL di anteprima delle tracce
                const previewUrls = tracks.body.items.map(item => item.track.preview_url);
                //console.log(previewUrls)
        
                // creiamo un array di oggetti Embed di Discord per visualizzare le informazioni sulla playlist
                //console.log(playlist.body.name)
                //console.log(tracks.body.items[0])
                const embeds = [
                    new MessageEmbed()
                        .setTitle(`Playlist: ${playlist.body.name}`)
                        .setDescription(playlist.body.description || '')
                        .setThumbnail(playlist.body.images[0].url)
                ];
        
                // creiamo un Embed di Discord per ogni traccia della playlist
                /*
                for(var i = 0; i < tracks.body.items.length; i++){
                    embeds[i] = new MessageEmbed()
                                    .setTitle(tracks.track.name)
                                    .setDescription(`Artista: ${tracks.track.artists[0].name}\nAlbum: ${tracks.track.album.name}`)
                                    .setThumbnail(tracks.track.album.images[0].url)
                                    .addFields({
                                        name: 'Durata',
                                        value: `${Math.floor(tracks.track.duration_ms / 1000 / 60)}:${Math.floor(tracks.track.duration_ms / 1000) % 60}`
                                    })
                }
                */
                for (const track of tracks.body.items) {
                    //console.log(track.track.name)
                    embeds.push(
                        new MessageEmbed()
                            .setTitle(track.track.name)
                            .setDescription(`Artista: ${track.track.artists[0].name}\nAlbum: ${track.track.album.name}`)
                            .setThumbnail(track.track.album.images[0].url)
                            .addFields({
                                name: 'Durata',
                                value: `${Math.floor(track.track.duration_ms / 1000 / 60)}:${Math.floor(track.track.duration_ms / 1000) % 60}`
                            })
                    );
                }
        
                // inviamo i messaggi Embed all'utente
                for (const embed of embeds) {
                    message.channel.send(embed);
                }
        
                // riproduciamo le anteprime delle tracce nell'ordine della playlist
                for (const previewUrl of previewUrls) {
                    if (previewUrl) {
                        const voiceChannel = message.member.voice.channel
                        const connection = joinVoiceChannel({
                            channelId: message.member.voice.channel.id,
                            guildId: message.guild.id,
                            adapterCreator: message.guild.voiceAdapterCreator
                        })
                        const player = createAudioPlayer()
                        const resource = createAudioResource(previewUrl)
                        connection.subscribe(player)
                        player.play(resource)
                        player.on(AudioPlayerStatus.Playing, () => {
                            console.log('La canzone sta partendo!');
                        });
                        player.on(AudioPlayerStatus.Idle, () => {
                            console.log('La canzone è finita.');
                            connection.destroy();
                        });
                }
        }
    } catch (error) {
        console.error(`Errore durante la riproduzione della playlist: ${error}`);
        message.channel.send('Errore durante la riproduzione della playlist.');
    }
};
})

// avviamo il bot Discord
client.login(config.token);
