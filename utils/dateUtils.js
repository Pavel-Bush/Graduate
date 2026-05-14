// Преобразует строку из datetime-local (YYYY-MM-DDTHH:MM) в формат MySQL (YYYY-MM-DD HH:MM:SS)
function toMySQLDatetime(datetimeLocalStr) {
	if (!datetimeLocalStr) return null
	// Заменяем 'T' на пробел, добавляем секунды, если отсутствуют
	let dt = datetimeLocalStr.replace('T', ' ')
	if (dt.split(':').length === 2) {
		dt += ':00'
	}
	return dt
}

module.exports = {
	toMySQLDatetime,
	// другие методы округления и проверки
}
