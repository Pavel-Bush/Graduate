const pool = require('../config/db')

const UserModel = {
	// Найти пользователя по email
	async findByEmail(email) {
		const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [
			email,
		])
		return rows[0] || null
	},

	// Создать нового пользователя
	async create({
		full_name,
		email,
		phone,
		password_hash,
		driver_license_number,
		birth_date,
	}) {
		const [result] = await pool.query(
			`INSERT INTO users (full_name, email, phone, password_hash, driver_license_number, birth_date, role)
             VALUES (?, ?, ?, ?, ?, ?, 'client')`,
			[
				full_name,
				email,
				phone,
				password_hash,
				driver_license_number,
				birth_date,
			],
		)
		return result.insertId
	},

	// Обновить хэш пароля (после миграции открытых паролей)
	async updatePasswordHash(userId, hash) {
		await pool.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [
			hash,
			userId,
		])
	},
}

module.exports = UserModel
