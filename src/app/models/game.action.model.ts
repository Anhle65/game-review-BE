import {getPool} from "../../config/db";

const addToWishlist = async (gameId: number, userId: number): Promise<boolean> => {
    const query: string = `INSERT INTO wishlist (game_id, user_id) VALUES (?, ?)`;
    const [result] = await getPool().query(query, [gameId, userId]);
    return result && result.affectedRows === 1;
}

const removeFromWishlist = async (gameId: number, userId: number): Promise<boolean> => {
    const query: string = `DELETE FROM wishlist WHERE game_id = ? AND user_id = ?`;
    const [result] = await getPool().query(query, [gameId, userId]);
    return result && result.affectedRows === 1;
}

const isAlreadyWishlisted = async (gameId: number, userId: number): Promise<boolean> => {
    const query: string = `SELECT * FROM wishlist WHERE game_id = ? AND user_id = ?`;
    const [result] = await getPool().query(query, [gameId, userId]);
    return result && result.length === 1;
}

const addToOwned = async (gameId: number, userId: number): Promise<boolean> => {
    const query: string = `INSERT INTO owned (game_id, user_id) VALUES (?, ?)`;
    const [result] = await getPool().query(query, [gameId, userId]);
    return result && result.affectedRows === 1;
}

const removeFromOwned = async (gameId: number, userId: number): Promise<boolean> => {
    const query: string = `DELETE FROM owned WHERE game_id = ? AND user_id = ?`;
    const [result] = await getPool().query(query, [gameId, userId]);
    return result && result.affectedRows === 1;
}

const isAlreadyOwned = async (gameId: number, userId: number): Promise<boolean> => {
    const query: string = `SELECT * FROM owned WHERE game_id = ? AND user_id = ?`;
    const [result] = await getPool().query(query, [gameId, userId]);
    return result && result.length === 1;
}

export {addToWishlist, removeFromWishlist, addToOwned, removeFromOwned, isAlreadyWishlisted, isAlreadyOwned}