import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import Logger from './logger';
dotenv.config();
// technically typed : {pool: mysql.Pool}
const state: any = {
    pool: null
};

const connect = async (): Promise<void> => {
    state.pool = mysql.createPool( {
        connectionLimit: 100,
        multipleStatements: true,
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: parseInt(process.env.MYSQL_PORT,10) || 3306,
        // uncomment below if using db1/db2
    } );
    await state.pool.getConnection(); // Check connection
    Logger.info(`Successfully connected to database`)
    return
};

// technically typed : () => mysql.Pool
const getPool = () => {
    return state.pool;
};

export {connect, getPool}
