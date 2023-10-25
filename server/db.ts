export const { roomsTable, connectionsTable } = (process.env.USE_LOCAL_DB ?? 'false').toLowerCase() === 'true'
    ? require('./local/db')
    : require('./amazon/db');
