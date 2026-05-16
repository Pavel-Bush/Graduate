/**
 * Проверяет, покрывает ли набор категорий пользователя требуемую категорию автомобиля.
 * @param {string[]} userCategories - массив категорий пользователя (например, ["B", "BE"])
 * @param {string} requiredCategory - требуемая категория (B, B_AT, BE, BE_AT)
 * @returns {boolean}
 */
function hasSufficientLicense(userCategories, requiredCategory) {
	if (!userCategories || userCategories.length === 0 || !requiredCategory) {
		return false
	}

	const required = requiredCategory.toUpperCase().trim()
	const userCats = userCategories.map(c => c.toUpperCase().trim())

	switch (required) {
		case 'B':
			// Для механики нужна B (или выше, но BE не покрывает B?
			// BE - легковые с тяжелым прицепом, обычно включает B?
			// В реальности BE открывает B, но у нас разделим:
			// Если человек имеет BE, он имеет и B. Упростим: наличие B или BE дает доступ к B.
			// B_AT не дает.
			return userCats.includes('B') || userCats.includes('BE')
		case 'B_AT':
			// Автомат: достаточно B, BE, B_AT, BE_AT
			return (
				userCats.includes('B') ||
				userCats.includes('B_AT') ||
				userCats.includes('BE') ||
				userCats.includes('BE_AT')
			)
		case 'BE':
			// Тяжелый прицеп с механикой: нужна BE (B недостаточно)
			return userCats.includes('BE')
		case 'BE_AT':
			// Тяжелый прицеп с автоматом: BE или BE_AT
			return userCats.includes('BE') || userCats.includes('BE_AT')
		default:
			return false
	}
}

module.exports = { hasSufficientLicense }
