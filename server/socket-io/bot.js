import * as clientIo from 'socket.io-client'

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


const setupBot = () => {
    var botDrones = []
    
    var position = {x: getRandomInt(-1000, 1000), y: getRandomInt(-1000, 1000), z: getRandomInt(300, 400)};

    var moveVector = {x: 0, y: 1, z: 0};
    var rotationVector = {x: 0, y: 0, z: 0};

    var rotation = { _x: 0, _y: 0, _z: 0, _order: 'XYZ'}
    
    botDrones.push({position, moveVector})
    
    var socket = clientIo.connect('http://192.168.98.186:3001')
    socket.on('connect', ()=> {
        console.log('hi');
    })

    socket.emit('getId', {position, rotation})

    socket.on('droneId', ({socket_id}) => {
        console.log(`bot id is ${socket_id}`)
    })

    socket.emit('position', {position, rotation})  
    
    setTimeout(() => {
        console.log('bot is shooting')
        socket.emit('keydown', {moveVector, rotationVector, position, rotation, velocity: {x: 0, y: 20, z: 0}})
    }, 10000);

    setTimeout(() => {
        socket.emit('keyup', {moveVector: {x: 0, y: 0, z: 0}, rotationVector, position, rotation, velocity: {x: 0, y: 0, z: 0}})
        
    }, 20000);

    return botDrones;
}


export default setupBot