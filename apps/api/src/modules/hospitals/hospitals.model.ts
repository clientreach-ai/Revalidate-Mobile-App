
import { getMySQLPool } from '../../config/database';

export interface Hospital {
    id: number;
    name: string;
    unique_id: string;
    about1: string;
    about2: string;
    about3: string;
    about4: string;
    about5: string;
    address1: string;
    address2: string;
    postcode: string;
    county: string;
    town: string;
    mobile: string | null;
    email: string | null;
    status: '0' | '1';
    created_at: string;
    updated_at: string;
}

export async function getAllHospitals(search?: string): Promise<Hospital[]> {
    const pool = getMySQLPool();
    let query = 'SELECT * FROM hospitals WHERE status = "1"';
    const params: any[] = [];

    if (search) {
        query += ' AND (name LIKE ? OR town LIKE ? OR postcode LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term);
    }

    query += ' ORDER BY name ASC';

    const [rows] = await pool.execute(query, params) as any[];
    return rows as Hospital[];
}
