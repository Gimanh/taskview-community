type UpdateData = { table: string; data: Record<string, any>; where: Record<string, any> };
export function updateQuery(data: UpdateData) {
    let i = 1;
    const args = [];
    let query = `UPDATE ${data.table} SET `;
    let fields: string[] = [];
    for (const name in data.data) {
        fields.push(`${name} = $${i}`);
        i++;
        args.push(data.data[name]);
    }
    query += fields.join(', ');

    fields = [];
    for (const name in data.where) {
        fields.push(`${name} = $${i}`);
        i++;
        args.push(data.where[name]);
    }
    query += ` WHERE ${fields.join(', ')}`;
    return {
        query,
        args,
    };
}
