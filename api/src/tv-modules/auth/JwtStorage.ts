import { Database } from '../../modules/db';
import { $logger } from '../../modules/logget';
import type { TokensFromDb } from '../../types/auth.types';

export default class JwtStorage {
    private db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async initTokenRecord(userId: number): Promise<number | false> {
        try {
            const data = await this.db.query<{ id: number }>(
                'INSERT INTO tv_auth.user_tokens (user_id) VALUES ($1) RETURNING id;',
                [userId]
            );
            if (data?.rows && data.rows.length > 0) {
                return data.rows[0].id;
            }
            return false;
        } catch (error: any) {
            $logger.error('Can not complete initTokenRecord', {
                userId,
                errorMessage: error.message,
                errorStack: error.stack,
            });
            return false;
        }
    }

    async updateTokens(accessToken: string, refreshToken: string, rowId: number): Promise<boolean> {
        const query = `
          UPDATE tv_auth.user_tokens
          SET access_token = $1, refresh_token = $2
          WHERE id = $3;
        `;

        try {
            const res = await this.db.query(query, [accessToken, refreshToken, rowId]);
            return !!(res.rowCount && res.rowCount > 0);
        } catch (error: any) {
            $logger.error('Error updating tokens:', { errorMessage: error.message, errorStack: error.stack });
            return false;
        }
    }

    async fetchTokens(rowId: number): Promise<TokensFromDb | false> {
        const query = 'SELECT * FROM tv_auth.user_tokens WHERE id = $1;';
        try {
            const res = await this.db.query<TokensFromDb>(query, [rowId]);
            if (res?.rows && res.rows.length > 0) {
                return res.rows[0];
            }

            return false;
        } catch (error: any) {
            $logger.error('Error fetching tokens', {
                rowId,
                errorMessage: error.message,
                errorStack: error.stack,
            });
            return false;
        }
    }

    async deleteTokens(userId: number, accessToken: string): Promise<boolean> {
        try {
            const query = 'DELETE FROM tv_auth.user_tokens WHERE user_id = $1 AND access_token = $2;';
            const deleteResul = await this.db.query(query, [userId, accessToken]);
            return !!(deleteResul.rowCount && deleteResul.rowCount > 0);
        } catch (_error: any) {
            return false;
        }
    }
}
