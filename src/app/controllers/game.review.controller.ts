import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as schemas from '../resources/schemas.json';
import * as gameModel from "../models/game.model";
import * as reviewModel from "../models/game.review.model"
import {validate} from "../services/validator";

const getGameReviews = async(req: Request, res: Response): Promise<void> => {
    try {
        const gameId: number = parseInt(req.params.id, 10);
        if (isNaN(gameId)) {
            res.statusMessage = "id must be an integer";
            res.status(400).send();
            return;
        }
        const game: gameFull = await gameModel.getOne(gameId);
        if (game == null) {
            res.status(404).send();
            return
        }
        const reviews = await reviewModel.getReviews(gameId);
        res.status(200).send(reviews);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const addGameReview = async(req: Request, res: Response): Promise<void> => {
    try {
        const gameId: number = parseInt(req.params.id, 10);
        if (isNaN(gameId)) {
            res.statusMessage = "id must be an integer";
            res.status(400).send();
            return;
        }
        const game: gameFull = await gameModel.getOne(gameId);
        if (game == null) {
            res.status(404).send();
            return
        }
        if (game.creatorId === req.authId) {
            res.statusMessage = "Cannot post a review on your own game.";
            res.status(403).send();
            return;
        }

        const reviews = await reviewModel.getReviews(gameId);
        if (reviews.find((r) => r.reviewerId === req.authId) !== undefined){
            res.statusMessage = "Cannot post more than one review on a game.";
            res.status(403).send();
            return;
        }

        const validation = await validate(schemas.game_review_post, req.body);
        if (validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }

        const added = await reviewModel.addReview(gameId, req.authId, parseInt(req.body.rating, 10), req.body.review);
        if (added) {
            res.status(201).send();
            return;
        } else {
            // todo: what could cause this case?
            res.statusMessage = "Game review could not be added";
            res.status(500).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}




export {getGameReviews, addGameReview};