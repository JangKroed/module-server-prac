import { UserStatus } from "./user";

interface PvpPlayer {
    socketId:string;
    userStatus: UserStatus;
}

// key에 User의 name
interface PvpUser {
    [key: string]: PvpPlayer;
}

// key에 User가 속한 pvpRoomName
// interface PvpRoom {
//     [key: string]: Map<string, PvpUser>;
// }














interface pvpResult {
    userNames: string[];
    target: string[];
    realDamage: number[];
    roomName?: string;
}



export {
    PvpPlayer,
    pvpResult,
    PvpUser,
}