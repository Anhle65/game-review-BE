import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as schemas from '../resources/schemas.json';
import * as gameModel from "../models/game.model";
import * as imageModel from '../models/images.model';
import * as reviewModel from "../models/game.review.model"
import {validate} from "../services/validator";

const getAllGames = async(req: Request, res: Response): Promise<void> => {
    try {
        const validation = await validate(schemas.game_search, req.query);
        if (validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`
            res.status(400).send();
            return;
        }

        if (req.query.hasOwnProperty("creatorId"))
            req.query.creatorId = parseInt(req.query.creatorId as string, 10) as any;
        if (req.query.hasOwnProperty("reviewerId"))
            req.query.reviewerId = parseInt(req.query.reviewerId as string, 10) as any;
        if (req.query.hasOwnProperty("supporterId"))
            req.query.supporterId = parseInt(req.query.supporterId as string, 10) as any;
        if (req.query.hasOwnProperty("price"))
            req.query.price = parseInt(req.query.price as string, 10) as any;
        if (req.query.hasOwnProperty("startIndex"))
            req.query.startIndex = parseInt(req.query.startIndex as string, 10) as any;
        if (req.query.hasOwnProperty("count"))
            req.query.count = parseInt(req.query.count as string, 10) as any;
        if (req.query.hasOwnProperty("genreIds")) {
            if (!Array.isArray(req.query.genreIds))
                req.query.genreIds = [parseInt(req.query.genreIds as string, 10)] as any;
            else
                req.query.genreIds = (req.query.genreIds as string[]).map((x: string) => parseInt(x, 10)) as any;
            const genres: genre[] = await gameModel.getGenres();
            if (!(req.query.genreIds as any as number[]).every(g => genres.map(x => x.genreId).includes(g))) {
                res.statusMessage = `Bad Request: No genre with id`;
                res.status(400).send();
                return;
            }
        }
        if (req.query.hasOwnProperty("platformIds")) {
            if (!Array.isArray(req.query.platformIds))
                req.query.platformIds = [parseInt(req.query.platformIds as string, 10)] as any;
            else
                req.query.platformIds = (req.query.platformIds as string[]).map((x: string) => parseInt(x, 10)) as any;
            const platforms: platform[] = await gameModel.getPlatforms();
            if (!(req.query.platformIds as any as number[]).every(g => platforms.map(x => x.platformId).includes(g))) {
                res.statusMessage = `Bad Request: No platform with id`;
                res.status(400).send();
                return;
            }
        }

        if (req.query.hasOwnProperty("ownedByMe"))
            req.query.ownedByMe = ((req.query.ownedByMe as string).toLowerCase() === 'true') as any;
        if (req.query.hasOwnProperty("wishlistedByMe"))
            req.query.wishlistedByMe = ((req.query.wishlistedByMe as string).toLowerCase() === 'true') as any;

        if (req.query.ownedByMe || req.query.wishlistedByMe)
            if (!req.hasOwnProperty("authId") || (req.hasOwnProperty("authId") && req.authId < 0)) {
                if (req.authId === -2) {
                    res.statusMessage = `Invalid authorization supplied`;
                    res.status(401).send();
                    return;
                } else if (req.authId === -1) {
                    // test suite will allow either 400 or 403
                    res.statusMessage = `Must supply X-Authorization header`;
                    res.status(400).send();
                    return;
                }
            }
            else
                req.query.userId = req.authId as any;

        let searchQuery: gameSearchQuery = {
            q: '',
            creatorId: -1,
            reviewerId: -1,
            price: -1,
            genreIds: [],
            platformIds: [],
            wishlistedByMe: false,
            ownedByMe: false,
            sortBy: 'CREATED_ASC',
            startIndex: 0,
            count: -1,
            userId: -1
        }
        searchQuery = {...searchQuery, ...req.query} as gameSearchQuery;

        const games: gameReturn = await gameModel.getAll(searchQuery);
        res.status(200).send(games);
        return;

    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const getGame = async(req: Request, res: Response): Promise<void> => {
    try {
        const gameId: number = parseInt(req.params.id, 10);
        if (isNaN(gameId)){
            res.statusMessage = "gameId must be an integer"
            res.status(400).send();
            return;
        }
        const game: gameFull = await gameModel.getOne(gameId);
        if(game != null) {
            res.status(200).send(game);
            return ;
        } else {
            res.status(404).send();
            return
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const addGame = async(req: Request, res: Response): Promise<void> => {
    try {
        const validation = await validate(schemas.game_post, req.body);
        if(validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }
        const d: Date = new Date()
        const creationDate: string = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
        const genres: genre[] = await gameModel.getGenres();
        if (!genres.find(g => g.genreId === req.body.genreId)) {
            res.statusMessage = "No genre with id";
            res.status(400).send();
            return;
        }

        const platforms: platform[] = await gameModel.getPlatforms();
        for (const pId of req.body.platformIds as number[]) {
            if (!platforms.find(p => p.platformId === pId)) {
                res.statusMessage = "No platform with id";
                res.status(400).send();
                return;
            }
        }

        const insertedGameId: number = await gameModel.addGame(req.authId, req.body.title, req.body.description, creationDate, req.body.genreId, req.body.price, req.body.platformIds)
        if (insertedGameId !== -1) {
            res.status(201).send({"gameId": insertedGameId})
            return;
        } else {
            // todo: how could this be caused?
            res.statusMessage = "Game could not be created";
            res.status(500).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        if (err.errno === 1062) { // 1062 = Duplicate entry MySQL error number
            res.statusMessage = "Forbidden: Duplicate petition";
            res.status(403).send();
            return;
        } else {
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
            return;
        }
    }
}


const editGame = async(req: Request, res: Response): Promise<void> => {
    try {
        const validation = await validate(schemas.game_patch, req.body);
        if(validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }

        const gameId: number = parseInt(req.params.id, 10);
        if (isNaN(gameId)){
            res.statusMessage = "gameId must be an integer"
            res.status(400).send();
            return;
        }
        const game: gameFull = await gameModel.getOne(gameId);
        if(game == null) {
            res.status(404).send();
            return;
        }
        if (game.creatorId !== req.authId) {
            res.statusMessage = "Cannot edit a game created by another user";
            res.status(403).send();
            return;
        }

        let title: string = game.title;
        if (req.body.hasOwnProperty("title")) {
            title = req.body.title;
        }
        let description: string = game.description;
        if (req.body.hasOwnProperty("description")) {
            description = req.body.description;
        }

        let price: number = game.price;
        if (req.body.hasOwnProperty("price")) {
            price = req.body.price;
        }

        let genreId: number = game.genreId;
        if (req.body.hasOwnProperty("genreId")){
            const genres: genre[] = await gameModel.getGenres();
            if (!genres.find(g=> g.genreId === req.body.genreId)) {
                res.statusMessage = "No genre with id";
                res.status(400).send();
                return;
            } else {
                genreId = req.body.genreId;
            }
        }

        let platformIds: number[] = game.platformIds;
        if (req.body.hasOwnProperty("platformIds")) {
            const platforms: platform[] = await gameModel.getPlatforms();
            (req.body.platformIds as number[]).forEach(pId => {
                if (!platforms.find(p => p.platformId === pId)) {
                    res.statusMessage = "No platform with id";
                    res.status(400).send();
                    return;
                }
            })
            platformIds = req.body.platformIds;
        }

        const result: boolean = await gameModel.editGame(gameId, title, description, genreId, price, platformIds)
        if(result){
            res.status(200).send();
            return;
        } else{
            // todo: how could this be caused?
            res.statusMessage = "Game could not be updated";
            res.status(500).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        if (err.errno === 1062) { // 1062 = Duplicate entry MySQL error number
            res.statusMessage = "Forbidden: Duplicate petition";
            res.status(403).send();
            return;
        } else {
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
            return;
        }
    }
}

const deleteGame = async(req: Request, res: Response): Promise<void> => {
    try {
        const gameId: number = parseInt(req.params.id, 10);
        if (isNaN(gameId)){
            res.statusMessage = "gameId must be an integer"
            res.status(400).send();
            return;
        }
        const game: gameFull = await gameModel.getOne(gameId);
        if(game == null) {
            res.status(404).send();
            return;
        }
        if (game.creatorId !== req.authId) {
            res.statusMessage = "Cannot delete a game created by another user";
            res.status(403).send();
            return;
        }

        const reviews: review[] = await reviewModel.getReviews(gameId);
        if (reviews && reviews.length>0){
            res.statusMessage = "Cannot delete a game after one or more reviews have been posted";
            res.status(403).send();
            return;
        }

        const filename: string = await gameModel.getImageFilename(gameId);
        const result: boolean = await gameModel.deleteGame(gameId);
        if(result) {
            if(filename!==null && filename!=="") {
                await imageModel.removeImage(filename)
            }
            res.status(200).send();
            return;
        } else {
            // todo: what could cause this case?
            res.statusMessage = "Game could not be deleted";
            res.status(500).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}


const getGenres = async(req: Request, res: Response): Promise<void> => {
    try {
        const genres: genre[] = await gameModel.getGenres();
        res.status(200).send(genres);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const getPlatforms = async(req: Request, res: Response): Promise<void> => {
    try {
        const platforms: platform[] = await gameModel.getPlatforms();
        res.status(200).send(platforms);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}


export {getAllGames, getGame, addGame, editGame, deleteGame, getGenres, getPlatforms};
