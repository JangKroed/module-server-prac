import { Request, Response, NextFunction } from 'express';
import PVP from '../redis';
import { pvpScript } from '../scripts';
import { HttpException } from '../common';
import { PostBody } from '../interfaces/common';
import { pvpHandler } from '../handler'
import { pvpController } from '.'
import pvpService, { rooms } from '../services/pvp.service';
import redis from '../db/cache/redis';

export const maxUsers: number = 2;
export const pvpRoomList: Set<string> = new Set<string>();
export default {
    createRoom: async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log('createRoom');
            const { socketId, CMD, userInfo, userStatus }: PostBody = req.body;
            const roomName = `pvpRoom ${CMD}`;

            if (!userInfo) new HttpException('userInfo missing', 400);
            if (!userStatus) new HttpException('userStatus missing', 400);

            // 방 생성 시 중복된 이름 또는 입력하지 않았는지 체크
            const validation = await pvpService.createRoomValidation(req, res, next, roomName)
            if (validation === 'wrongCommand') return;

            // rooms 갱신 및 수정된 유저정보 갱신 후 새로운 userStatus를 return 받아온다.
            const newUserStatus = await pvpService.createRoom({ socketId, CMD, userInfo, userStatus });

            const script = pvpScript.pvpRoomJoin(userInfo!.name);
            const field = 'pvpJoin';

            PVP.in(socketId).socketsJoin(roomName);

            PVP.to(socketId).emit('printBattle', { field, userInfo, userStatus: newUserStatus });
            PVP.to(roomName).emit('fieldScriptPrint', { script, field });

            console.log(rooms)

            res.status(200).end();
        } catch (err) {
            next(err);
        }
    },

    joinRoom: async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log('joinRoom');
            const { socketId, CMD, userInfo, userStatus }: PostBody = req.body;
            const roomName = `pvpRoom ${CMD}`;

            if (!userInfo) new HttpException('userInfo missing', 400);
            if (!userStatus) new HttpException('userStatus missing', 400);

            const validation = await pvpService.joinRoomValidation(req, res, next, roomName)
            if (validation === 'wrongCommand') return;

            PVP.in(socketId).socketsJoin(roomName);

            const newUserStatus = await pvpService.joinRoom({ socketId, CMD, userInfo, userStatus })

            const startValidation = await pvpService.startValidation(req, res, next, roomName)
            if (startValidation === undefined) return;

            const script = pvpScript.pvpRoomJoin(userInfo!.name);
            const field = 'pvpJoin';

            PVP.to(socketId).emit('printBattle', { field, userInfo, userStatus: newUserStatus });
            PVP.to(roomName).emit('fieldScriptPrint', { script, field });

            console.log(rooms);

            res.status(200).end();
        } catch (err) {
            next(err);
        }
    },

    getUsers:async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log('getUsers')
            const { socketId, CMD, userInfo, userStatus }: PostBody = req.body;

            if (!userInfo) new HttpException('userInfo missing', 400);
            if (!userStatus) new HttpException('userStatus missing', 400);

            const script = await pvpService.getUsers(userStatus!.pvpRoom!);
            const field = 'pvpJoin';

            PVP.to(socketId).emit('printBattle', { script, userInfo, field, userStatus });

            res.status(200).end();
        } catch (err) {
            next(err);
        }},

    leaveRoom:async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log('leaveRoom')
            const { socketId, CMD, userInfo, userStatus }: PostBody = req.body;

            if (!userInfo) new HttpException('userInfo missing', 400);
            if (!userStatus) new HttpException('userStatus missing', 400);

            await pvpService.leaveRoom(userStatus)

            const script = pvpScript.village;
            const field = 'village';

            PVP.to(socketId).socketsLeave(userStatus.pvpRoom!);
            PVP.to(socketId).emit('printBattle', { script, userInfo, field, userStatus });

            res.status(200).end();
        } catch (err) {
            next(err);
        }},

    pvpDisconnect:async (req: Request, res: Response, next: NextFunction) => {
        const { socketId }: PostBody = req.body;

        console.log(`Disconnect : ${socketId}`)

        res.status(200).end();
    },

    pvpStart:async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log('pvpStart')
            const { socketId, userInfo, userStatus }: PostBody = req.body;

            if (!userInfo) new HttpException('userInfo missing', 400);
            if (!userStatus) new HttpException('userStatus missing', 400);

            const roomName = userStatus!.pvpRoom!;

            const script = await pvpService.pvpStart(roomName);
            const field = 'pvpBattle';

            PVP.to(roomName).emit('fieldScriptPrint', { script, field });

            res.status(200).end();
        } catch (err) {
            next(err);
        }
    },

    battle: async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log('pvpbattle')
            const { socketId, userInfo, userStatus }: PostBody = req.body;

            if (!userInfo) new HttpException('userInfo missing', 400);
            if (!userStatus) new HttpException('userStatus missing', 400);

            const roomName = userStatus!.pvpRoom!;

            const script = pvpService.pvpStart(roomName);
            const field = 'enemyChoice';

            PVP.to(roomName).emit('fieldScriptPrint', { script, field });

            res.status(200).end();
        } catch (err) {
            next(err);
        }
    },

    // target: async (req: Request, res: Response, next: NextFunction) => {
    //     try {
    //         console.log('target')
    //         const { socketId, CMD, userInfo, userStatus }: PostBody = req.body;

    //         if (!userInfo) new HttpException('userInfo missing', 400);
    //         if (!userStatus) new HttpException('userStatus missing', 400);

    //         const targetValidation = pvpService.targetValidation(req, res, next);
    //         if (targetValidation === 'wrong') return;

    //         const script = pvpScript.target;
    //         const field = 'enemyChoice';

    //         PVP.to(socketId).emit('printBattle', { script, userInfo, field, userStatus });

    //         res.status(200).end();
    //     } catch (err) {
    //         next(err);
    //     }
    // },

    // targetWrong: (req: Request, res: Response, next: NextFunction) => {
    //     try {
    //         console.log('targetWrong')
    //         const { socketId, CMD, userInfo, userStatus }: PostBody = req.body;

    //         const script = pvpScript.targetWrong;
    //         const field = 'enemyChoice';

    //         PVP.to(socketId).emit('printBattle', { script, userInfo, field, userStatus });

    //         res.status(200).end();
    //     } catch (err) {
    //         next(err);
    //     }
    // },

    // // 추후 service에서 script와 names를 array로 return받아 구조분해 할당 후 PVP.to(socketId)
    // restultTarget: (req: Request, res: Response, next: NextFunction) => {
    //     try {
    //         console.log('restultTarget')
    //         const { socketId, CMD, userInfo, userStatus }: PostBody = req.body;

    //         if (!userInfo) new HttpException('userInfo missing', 400);
    //         if (!userStatus) new HttpException('userStatus missing', 400);

    //         pvpService.resultTarget(userStatus!)
    //         pvpService.skillList(userStatus!)
            
    //         res.status(200).end();
    //     } catch (err) {
    //         next(err);
    //     }},

    // pickSkill: (req: Request, res: Response, next: NextFunction) => {
    //     console.log('pickSkill')
    //     const { socketId, CMD, userInfo, userStatus }: PostBody = req.body;

    //     if (!userInfo) new HttpException('userInfo missing', 400);
    //     if (!userStatus) new HttpException('userStatus missing', 400);

    //     const pickSkillValidayion = pvpService.pickSkillValidayion(req, res, next)
    //     if (pickSkillValidayion === undefined) return;

    //     pvpService.pickSkill(req, res, next)

    //     const script = pvpScript.pickSkill;
    //     const field = 'attackChoice';

    //     PVP.to(socketId).emit('printBattle', { script, userInfo, field, userStatus });

    //     res.status(200).end();
    // },

    // pvpFight: (req: Request, res: Response, next: NextFunction) => {
    //     try {
    //         console.log('pvpfight')
    //         const { socketId, CMD, userInfo, userStatus }: PostBody = req.body;
    //         const roomName = userStatus!.pvpRoom
    //         const pvpRoom = rooms.get(roomName!)

    //         const arranging = pvpService.arranging(userStatus!);

    //         const { where, script, field } = pvpService.pvpResult({ ...arranging, roomName });

    //         setTimeout(() => {
    //             if (where === 'continue') {
    //                 PVP.to(roomName!).emit('fieldScriptPrint', { field, script });
    //                 const request = { body: { socketId, userInfo, userStatus } };
    //                 return pvpController.pvpStart(request as Request, res, next)
    //             } else if (where === 'exit') {
    //                 const socketIds: string[] = [];
    //                 const iterator = pvpRoom!.values()
    //                 for (let i = 0; i < maxUsers; i++) socketIds.push(iterator!.next().value.socketId);
    //                 PVP.in(socketIds).socketsLeave(roomName!)
    //             }
    //         }, 3000);

    //         res.status(200).end();
    //     } catch (err) {
    //         next(err);
    //     }},

    wrongCommand: (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log('pvpWrongCommand')
            const { socketId, CMD, userInfo, userStatus, option }: PostBody = req.body;

            const script = pvpScript.wrongCommand(CMD);
            const field = `${option}`;

            PVP.to(socketId).emit('printBattle', { script, userInfo, field, userStatus });

            res.status(200).end();
        } catch (err) {
            next(err);
        }
    },

    help: (req: Request, res: Response, next: NextFunction) => {
        try {
            const { socketId, CMD, userInfo, userStatus, option }: PostBody = req.body;
            console.log(`${option}`)

            if (!userInfo) new HttpException('userInfo missing', 400);
            if (!userStatus) new HttpException('userStatus missing', 400);

            const script = pvpHandler.pvpHelp(option!)
            const field = `${option}`;

            PVP.to(socketId).emit('printBattle', { script, userInfo, field, userStatus });

            res.status(200).end();
        } catch (err) {
            next(err);
        }
    },

    // wrongPickSkills: (req: Request, res: Response, next: NextFunction) => {
    //     try {
    //         console.log('wrongPickSkills')
    //         const { socketId, CMD, userInfo, userStatus }: PostBody = req.body;

    //         const script = pvpScript.wrongPickSkills(CMD);
    //         const field = 'attackChoice';

    //         PVP.to(socketId).emit('printBattle', { script, userInfo, field, userStatus });

    //         res.status(200).end();
    //     } catch (err) {
    //         next(err);
    //     }
    // },
};
