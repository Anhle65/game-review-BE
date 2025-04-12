import {getPool} from "../../config/db";

const getReviews = async (gameId: number): Promise<review[]> => {
    const query: string = `SELECT
    R.user_id as reviewerId,
    U.first_name as reviewerFirstName,
    U.last_name as reviewerLastName,
    R.rating as rating,
    R.review as review,
    R.timestamp as timestamp
    FROM game_review R LEFT JOIN user U  on R.user_id = U.id
    WHERE game_id=?
    ORDER BY timestamp DESC`
    const rows = await getPool().query(query, [gameId])
    return rows[0] as review[];
}

const addReview = async (gameId: number, userId: number, rating: number, review: string): Promise<boolean> => {
    const query = `INSERT INTO game_review (game_id, user_id, rating, review, timestamp) VALUES (?, ?, ?, ?, ?)`;
    const [result] = await getPool().query(query, [gameId, userId, rating, review, new Date()]);
    return result && result.affectedRows === 1;
}


export {getReviews, addReview}