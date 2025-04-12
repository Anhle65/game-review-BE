import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as gameModel from "../models/game.model";
import * as gameActionModel from "../models/game.action.model";


const addGameToWishlist = async(req: Request, res: Response): Promise<void> => {
    try {
        const gameId: number = parseInt(req.params.id, 10);
        if (isNaN(gameId)) {
            res.statusMessage = "id must be an integer";
            res.status(400).send();
            return;
        }
        const game: gameFull = await gameModel.getOne(gameId)
        if (game == null) {
            res.status(404).send();
            return
        }
        if (game.creatorId === req.authId) {
            res.statusMessage = "Cannot wishlist a game you created";
            res.status(403).send();
        }
        const isAlreadyOwned: boolean = await gameActionModel.isAlreadyOwned(gameId, req.authId);
        if (isAlreadyOwned) {
            res.statusMessage = "Cannot wishlist a game that is already marked as owned"
            res.status(403).send() // what code makes sense here?
            return
        }
        const isAlreadyWishlisted: boolean = await gameActionModel.isAlreadyWishlisted(gameId, req.authId);
        if (isAlreadyWishlisted) {
            res.statusMessage = "OK. Game is already on your wishlist"
            res.status(200).send() // what code makes sense here?
            return
        }
        const added: boolean = await gameActionModel.addToWishlist(gameId, req.authId)
        if (added) {
            res.status(200).send();
            return;
        } else {
            res.statusMessage = 'Error occurred while adding game to wishlist';
            res.status(500).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const removeGameFromWishlist = async(req: Request, res: Response): Promise<void> => {
    try {
        const gameId: number = parseInt(req.params.id, 10);
        if (isNaN(gameId)) {
            res.statusMessage = "id must be an integer";
            res.status(400).send();
            return;
        }
        const game: gameFull = await gameModel.getOne(gameId)
        if (game == null) {
            res.status(404).send();
            return
        }
        const isAlreadyWishlisted: boolean = await gameActionModel.isAlreadyWishlisted(gameId, req.authId);
        if (!isAlreadyWishlisted) {
            res.statusMessage = "Cannot unwishlist a game that is not currently wishlisted"
            res.status(403).send(); // what code makes sense here?
            return
        }
        const removed: boolean = await gameActionModel.removeFromWishlist(gameId, req.authId);
        if (removed) {
            res.status(200).send();
            return;
        } else {
            res.statusMessage = 'Error occurred while removing game from wishlist';
            res.status(500).send();
            return;
        }

    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const addGameToOwned = async(req: Request, res: Response): Promise<void> => {
    try {
        const gameId: number = parseInt(req.params.id, 10);
        if (isNaN(gameId)) {
            res.statusMessage = "id must be an integer";
            res.status(400).send();
            return;
        }
        const game: gameFull = await gameModel.getOne(gameId)
        if (game == null) {
            res.status(404).send();
            return
        }
        if (game.creatorId === req.authId) {
            res.statusMessage = "Cannot mark a games as owned that you created";
            res.status(403).send();
        }
        const isAlreadyWishlisted: boolean = await gameActionModel.isAlreadyWishlisted(gameId, req.authId);
        if (isAlreadyWishlisted) {
            const wishlistRemoved: boolean = await gameActionModel.removeFromWishlist(gameId, req.authId);
            if (!wishlistRemoved) {
                res.statusMessage = "Whoops something went wrong, could not remove game from owned";
                res.status(500).send();
                return
            }
        }
        const isAlreadyOwned: boolean = await gameActionModel.isAlreadyOwned(gameId, req.authId);
        if (isAlreadyOwned) {
            res.statusMessage = "OK. Game is already owned"
            res.status(200).send(); // what code makes sense here?
            return
        }
        const added: boolean = await gameActionModel.addToOwned(gameId, req.authId)
        if (added) {
            res.status(200).send();
            return;
        } else {
            res.statusMessage = 'Error occurred while marking game as owned';
            res.status(500).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const removeGameFromOwned = async(req: Request, res: Response): Promise<void> => {
    try {
        const gameId: number = parseInt(req.params.id, 10);
        if (isNaN(gameId)) {
            res.statusMessage = "id must be an integer";
            res.status(400).send();
            return;
        }
        const game: gameFull = await gameModel.getOne(gameId)
        if (game == null) {
            res.status(404).send();
            return
        }
        const isAlreadyOwned: boolean = await gameActionModel.isAlreadyOwned(gameId, req.authId);
        if (!isAlreadyOwned) {
            res.statusMessage = "Cannot un-own a game that is not currently owned"
            res.status(403).send(); // what code makes sense here?
            return
        }
        const added: boolean = await gameActionModel.removeFromOwned(gameId, req.authId)
        if (added) {
            res.status(200).send();
            return;
        } else {
            res.statusMessage = 'Error occurred while un marking game as owned';
            res.status(500).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

export {addGameToWishlist, removeGameFromWishlist, addGameToOwned, removeGameFromOwned};