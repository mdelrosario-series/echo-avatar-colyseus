import config from '@colyseus/tools';
import { defineRoom } from 'colyseus';
import { EchoGameRoom } from './rooms/EchoGameRoom';
import { GlobalLobbyRoom } from './rooms/GlobalLobbyRoom';
export default config({
    displayLogs: true,
    options: {},
    rooms: {
        global_lobby: defineRoom(GlobalLobbyRoom),
        world_room: defineRoom(EchoGameRoom, { echoRoomType: 'world_room', maxClients: 50 }).filterBy(['plazaId']),
        player_room: defineRoom(EchoGameRoom, { echoRoomType: 'player_room', maxClients: 10 }).filterBy(['ownerProfileId']),
        avatar_room: defineRoom(EchoGameRoom, { echoRoomType: 'avatar_room', maxClients: 25 }),
    },
});
