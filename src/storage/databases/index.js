import { MongoDB, Collection } from "./mongo"
import { PostgreSQL, Table } from "./postgres"

export { MongoDB, Collection, PostgreSQL, Table }

/**
 * @type { import('../../index').IDatabase }
 */
export default { MongoDB, PostgreSQL }