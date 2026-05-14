const bcrypt = require('bcrypt')

const SALT_ROUNDS = 10

module.exports = {
	async hash(password) {
		return bcrypt.hash(password, SALT_ROUNDS)
	},

	async compare(password, hash) {
		return bcrypt.compare(password, hash)
	},
}
