const io = require('socket.io-client')

const socket = io.connect('http://192.168.98.186:3001')
socket.on('connect', () => {
    
})


export default socket