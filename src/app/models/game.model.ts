import {getPool} from "../../config/db";


const getAll = async (searchQuery: gameSearchQuery): Promise<gameReturn> => {
    let query: string = `SELECT DISTINCT
    G.id as gameId,
    G.title as title,
    G.genre_id as genreId,
    G.creation_date as creationDate,
    G.creator_id as creatorId,
    G.price as price,
    U.first_name as creatorFirstName,
    U.last_name as creatorLastName,
    (SELECT FORMAT(IFNULL(AVG(rating), 0), 2) FROM game_review WHERE game_id = G.id) as rating,
    (SELECT GROUP_CONCAT(P.id) FROM game_platforms GP JOIN platform P ON GP.platform_id = P.id WHERE GP.game_id = G.id) as platformIds
    FROM game G JOIN user U on G.creator_id = U.id `
    let countQuery: string = `SELECT COUNT(DISTINCT G.id) from game G JOIN user U on G.creator_id = U.id `

    if (searchQuery.reviewerId && searchQuery.reviewerId !== -1) {
        query += `INNER JOIN (SELECT DISTINCT user_id, game_id from game_review) R on G.id = R.game_id AND R.user_id = ${searchQuery.reviewerId} `
        countQuery += `INNER JOIN (SELECT DISTINCT user_id, game_id from game_review) R on G.id = R.game_id AND R.user_id = ${searchQuery.reviewerId} `
    }

    if (searchQuery.ownedByMe && searchQuery.userId && searchQuery.userId !== -1) {
        query += `INNER JOIN owned O on G.id = O.game_id AND O.user_id = ${searchQuery.userId} `
        countQuery += `INNER JOIN owned O on G.id = O.game_id AND O.user_id = ${searchQuery.userId} `
    }

    if (searchQuery.wishlistedByMe && searchQuery.userId && searchQuery.userId !== -1) {
        query += `INNER JOIN wishlist W on G.id = W.game_id AND W.user_id = ${searchQuery.userId} `
        countQuery += `INNER JOIN wishlist W on G.id = W.game_id AND W.user_id = ${searchQuery.userId} `
    }

    const whereConditions: string[] = []
    const values: any[] = []
    if (searchQuery.q && searchQuery.q !== "") {
        whereConditions.push('(title LIKE ? OR description LIKE ?)');
        values.push(`%${searchQuery.q}%`);
        values.push(`%${searchQuery.q}%`);
    }

    if (searchQuery.price !== null && searchQuery.price !== -1) {
        whereConditions.push('price <= ?');
        values.push(searchQuery.price);
    }

    if (searchQuery.creatorId && searchQuery.creatorId !== -1) {
        whereConditions.push('creator_id = ?');
        values.push(searchQuery.creatorId);
    }

    if (searchQuery.genreIds && searchQuery.genreIds.length) {
        whereConditions.push('genre_id in (?)');
        values.push(searchQuery.genreIds);
    }

    if (searchQuery.platformIds && searchQuery.platformIds.length) {
        query += `JOIN game_platforms GP ON G.id = GP.game_id `;
        countQuery += `JOIN game_platforms GP ON G.id = GP.game_id `;
        whereConditions.push('GP.platform_id IN (?)');
        values.push(searchQuery.platformIds);
    }

    if (whereConditions.length) {
        query += `\nWHERE ${(whereConditions ? whereConditions.join(' AND ') : 1)}\n`
        countQuery += `\nWHERE ${(whereConditions ? whereConditions.join(' AND ') : 1)}\n`
    }
    const countValues = [...values];

    const searchSwitch = (sort: string) => ({
        'ALPHABETICAL_ASC': `ORDER BY title ASC`,
        'ALPHABETICAL_DESC': `ORDER BY title DESC`,
        'PRICE_ASC': `ORDER BY price ASC`,
        'PRICE_DESC': `ORDER BY price DESC`,
        'RATING_ASC': `ORDER BY CAST(rating AS FLOAT) ASC`,
        'RATING_DESC': `ORDER BY CAST(rating AS FLOAT) DESC`,
        'CREATED_ASC': `ORDER BY creationDate ASC`,
        'CREATED_DESC': `ORDER BY creationDate DESC`
    })[sort];
    query += searchSwitch(searchQuery.sortBy) + ', gameId\n';

    if (searchQuery.count && searchQuery.count !== -1) {
        query += 'LIMIT ?\n';
        values.push(searchQuery.count);
    }

    if (searchQuery.startIndex && searchQuery.startIndex !== -1) {
        if (!searchQuery.count || searchQuery.count === -1) {
            query += 'LIMIT ?\n';
            values.push(10000000);
        }
        query += 'OFFSET ?\n';
        values.push(searchQuery.startIndex);
    }


    const rows = await getPool().query(query, values);
    const games = rows[0];
    games.forEach((game: game) => {
        game.rating = +game.rating
        game.platformIds = game.platformIds ? (game.platformIds as unknown as string).split(",").map(Number) : [];  // Parse platforms as number[]
    });
    const countRows = await getPool().query(countQuery, countValues);
    const count = Object.values(JSON.parse(JSON.stringify(countRows[0][0])))[0];
    return {games, count} as gameReturn;
}

const getOne = async (gameId: number): Promise<gameFull> => {
    const query: string = `SELECT
    G.id as gameId,
    G.title as title,
    G.description as description,
    G.genre_id as genreId,
    G.creation_date as creationDate,
    G.creator_id as creatorId,
    G.price as price,
    U.first_name as creatorFirstName,
    U.last_name as creatorLastName,
    (SELECT FORMAT(IFNULL(AVG(rating), 0), 2) FROM game_review WHERE game_id = G.id) as rating,
    (SELECT GROUP_CONCAT(P.id) FROM game_platforms GP JOIN platform P ON GP.platform_id = P.id WHERE GP.game_id = G.id) as platformIds,
    (SELECT COUNT(*) from wishlist where game_id = G.id) as numberOfWishlists,
    (SELECT COUNT(*) from owned where game_id = G.id) as numberOfOwners
    FROM game G JOIN user U on G.creator_id = U.id
    WHERE G.id = ?`

    const rows = await getPool().query(query, gameId);
    const game: gameFull = rows[0].length === 0?null: rows[0][0] as unknown as gameFull;
    if (game !== null) {
        game.rating = +game.rating
        game.platformIds = game.platformIds ? (game.platformIds as unknown as string).split(",").map(Number) : [];  // Parse platforms as number[]
    }
    return game;
}

const addGame = async (creatorId: number, title: string, description: string, creationDate: string, genreId: number, price: number, platformIds: number[]): Promise<number> => {
    const query: string = `INSERT INTO game (creator_id, title, description, creation_date, genre_id, price) VALUES (?, ?, ?, ?, ?, ?)`;
    const [result] = await getPool().query(query, [creatorId, title, description, creationDate, genreId, price]);
    if (result.insertId > 0) {
        const platforms = platformIds.map(p => [result.insertId, p]);
        const query2: string = `INSERT INTO game_platforms (game_id, platform_id) VALUES ?`;
        const [result2] = await getPool().query(query2, [platforms]);
        // todo: does the insert need to be checked?
        return result.insertId;
    } else {
        return -1;
    }
}

const editGame = async (gameId: number, title: string, description: string, genreId: number, price: number, platformIds: number[]): Promise<boolean> => {
    const query: string = `UPDATE game SET title=?, description=?, genre_id=?, price=? WHERE id=?`;
    const [result] = await getPool().query(query, [title, description, genreId, price, gameId]);
    if (result && result.affectedRows === 1) {
        const query2: string = `DELETE FROM game_platforms WHERE game_id=?`;
        await getPool().query(query2, [gameId]);
        const platforms = platformIds.map(p => [gameId, p]);
        const query3: string = `INSERT INTO game_platforms (game_id, platform_id) VALUES ?`;
        await getPool().query(query3, [platforms]);
        return true;
    }
    return false;
}


const deleteGame = async (gameId: number): Promise<boolean> => {
    const query2: string = `DELETE FROM game_platforms WHERE game_id=?`;
    await getPool().query(query2, [gameId]);
    const query: string = `DELETE FROM game where id=?`;
    const [result] = await getPool().query(query, [gameId])
    return result && result.affectedRows === 1;
}

const getImageFilename = async (gameId: number): Promise<string> => {
    const query: string = 'SELECT `image_filename` FROM `game` WHERE id = ?';
    const rows = await getPool().query(query, [gameId]);
    return rows[0].length === 0 ? null : rows[0][0].image_filename;
}

const setImageFilename = async (gameId: number, filename: string): Promise<void> => {
    const query: string = "UPDATE `game` SET `image_filename`=? WHERE `id`=?";
    const result = await getPool().query(query, [filename, gameId]);
}

const getGenres = async (): Promise<genre[]> => {
    const query: string = `SELECT id as genreId, name from genre`;
    const rows = await getPool().query(query);
    return rows[0] as genre[];
}

const getPlatforms = async (): Promise<platform[]> => {
    const query: string = `SELECT id as platformId, name from platform`;
    const rows = await getPool().query(query);
    return rows[0] as platform[];
}

export {getAll, getOne, addGame, editGame, deleteGame, getImageFilename, setImageFilename, getGenres, getPlatforms}