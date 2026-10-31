// Game content: kept on the phone so games work with no signal on the highway.
export const GAMES = {
  antakshari: { em: '🎤', name: 'Antakshari', sub: 'Sing a song starting with the letter. Cars take turns.', g: '#B5121B', who: 'car vs car' },
  bingo: { em: '🐃', name: 'Road bingo', sub: 'Spot things out of the window. A full line wins 3.', g: '#E8890C', who: 'each car' },
  quiz: { em: '🛕', name: 'Yatra quiz', sub: 'Questions about the places on your route.', g: '#0F7C7A', who: 'everyone' },
  charades: { em: '🎬', name: 'Dumb charades', sub: 'Act out the film, no talking. For the hotel or a dhaba stop.', g: '#7A5442', who: 'at a stop' },
}
export const LETTERS = [['म', 'ma'], ['क', 'ka'], ['ह', 'ha'], ['द', 'da'], ['ज', 'ja'], ['प', 'pa'], ['त', 'ta'], ['स', 'sa'], ['ब', 'ba'], ['र', 'ra'], ['ल', 'la'], ['न', 'na'], ['ग', 'ga'], ['च', 'cha'], ['य', 'ya'], ['आ', 'aa']]
export const SIGHTS = [['🚚', 'Horn OK Please truck'], ['🌾', 'Sugarcane cart'], ['⛰️', 'Temple on a hill'], ['🐃', 'Buffalo on the road'], ['🚗', 'KA number plate'], ['🚙', 'AP number plate'], ['🛣️', 'Toll plaza'], ['🌬️', 'Windmill'], ['🚜', 'Tractor playing music'], ['🍽️', 'Dhaba named after a god'], ['🌻', 'Sunflower field'], ['🏍️', '3 on one bike'], ['🌳', 'Huge banyan tree'], ['🐐', 'Herd of goats'], ['🐒', 'Monkey'], ['🚩', 'Saffron flag'], ['🚌', 'TTD or pilgrim bus'], ['🥥', 'Coconut stall']]
export const QUIZ = [
  ['Which jyotirlinga is on your return route?', ['Mallikarjuna, Srisailam', 'Bhimashankar', 'Grishneshwar'], 0, 'Srisailam, on the Krishna in the Nallamala forest.'],
  ['Tulja Bhavani is the kuldevi of which family?', ['Holkar', 'Bhosale', 'Shinde'], 1, 'The Bhosales, Chhatrapati Shivaji Maharaj\'s family.'],
  ['What was Kalaburagi called before?', ['Gulbarga', 'Bidar', 'Raichur'], 0, 'It was renamed Kalaburagi in 2014.'],
  ['The Venkateswara temple stands on which hill?', ['Seshadri', 'Garudadri', 'Venkatadri'], 2, 'Venkatadri is one of the seven hills of Tirumala.'],
  ['Akkalkot is famous for which saint?', ['Sai Baba', 'Swami Samarth', 'Gajanan Maharaj'], 1, 'The Shri Swami Samarth math is in Akkalkot.'],
  ['Mahabubnagar\'s giant old banyan tree is called…', ['Pillalamarri', 'Kalpavriksha', 'Thimmamma'], 0, 'Pillalamarri, said to be about 700 years old.'],
  ['Kadapa\'s old name "Gadapa" means…', ['Hill', 'Threshold', 'River'], 1, 'The threshold, or gateway, to the Tirumala hills.'],
  ['Kurnool sits on which river?', ['Godavari', 'Krishna', 'Tungabhadra'], 2, 'The Tungabhadra; Kurnool was Andhra State\'s capital 1953–56.'],
  ['How many hills make up Tirumala?', ['Three', 'Five', 'Seven'], 2, 'Seven, which is why Balaji is called Saptagirivasa.'],
  ['Solapur is famous for which handloom?', ['Paithani sarees', 'Solapuri chaddar', 'Kolhapuri chappals'], 1, 'Solapuri chaddars (bedsheets) are sold all over India.'],
]
export const FILMS = ['Sholay', 'Ashi Hi Banwa Banwi', 'Lagaan', 'Sairat', 'Natsamrat', 'Dilwale Dulhania Le Jayenge', 'Hum Aapke Hain Koun', 'Navra Maza Navsacha', 'Taare Zameen Par', '3 Idiots', 'Baahubali', 'Zapatlela', 'Mughal-e-Azam', 'Bajrangi Bhaijaan', 'Dhamaal', 'Ved', 'Pushpa', 'Jodhaa Akbar']
export const PINGS = [['☕', 'Chai stop'], ['⛽', 'Fuel'], ['🚻', 'Washroom'], ['🐢', 'Slow down'], ['✋', 'Wait for us'], ['🍛', 'Food stop'], ['🙏', 'All OK']]
// Bingo lines on a 4×4 card: rows, columns, both diagonals.
export const LINES = [...[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => r * 4 + c)), ...[0, 1, 2, 3].map((c) => [0, 1, 2, 3].map((r) => r * 4 + c)), [0, 5, 10, 15], [3, 6, 9, 12]]
export const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1])
export const pick = (a) => a[Math.floor(Math.random() * a.length)]
