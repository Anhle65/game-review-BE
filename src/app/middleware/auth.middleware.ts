import {findUserByToken} from "../models/user.model";
import {NextFunction, Request, Response} from "express";
import Logger from "../../config/logger";

const authenticate = async (req: Request, res: Response, next:NextFunction): Promise<void> => {
    try {
        const token: string = req.header('X-Authorization');
        const user: user = await findUserByToken(token);
        if(user === null) {
            res.statusMessage = 'Unauthorized';
            res.status(401).send();
            return;
        }
        req.authId = user.id;
        next();
    } catch (err) {
        Logger.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
        return;
    }
}

const relaxedAuthenticate = async (req: Request, _res: Response, next:NextFunction): Promise<void> => {
    try {
        const token: string = req.header('X-Authorization');
        const user: user = await findUserByToken(token);
        if (token !== undefined && user === null) {
            // very hacky: return -2 if a token is supplied but it is not valid
            req.authId = -2;
            next();
        } else if(user !== null) {
            req.authId = user.id;
            next();
        } else {
            req.authId = -1;
            next();
        }
    } catch (err) {
        req.authId = -1;
        next();
    }
}

export {authenticate, relaxedAuthenticate}