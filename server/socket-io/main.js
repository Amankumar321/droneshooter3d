let drones = []

const mainsocket = (io) => {
    return io.on("connection", (client) => {
        console.log(`connected ${client.id}`)
        client.position = { x: 0, y: 0, z: 0 }
        //client.rotation = { _x: 0, _y: 0, _z: 0, _order: 'XYZ'}
        client.index = drones.push({socket_id: client.id, position: client.position})
        client.broadcast.emit('newOpponentDrone', ({newDrone: drones[drones.length - 1]}))

        client.on('getId', ({position, rotation}) => {
            client.position = {...position}
            client.rotation = {...rotation}
            drones[client.index - 1].position = {...position} 
            client.emit('droneId', {socket_id: client.id})
        })

        client.on('newDrone', () => {
            let opponentDrone = drones.filter((drone) => drone.socket_id === client.id);
            client.broadcast.emit('newOpponentDrone', ({newDrone: opponentDrone[0]}))
        })

        client.on('getDrones', () => {
            let opponentDrones = drones.filter((drone) => drone.socket_id !== client.id);
            client.emit('initDrones', {opponentDrones})
            console.log(`${client.id} got drones`)
        })

        client.on("disconnect", () => {
            drones = drones.filter((drone) => drone.socket_id !== client.id);
            client.broadcast.emit('removeOpponentDrone', ({socket_id: client.id}))
        })

        client.on('position', ({position, rotation}) => {
            client.position = {...position}
            client.rotation = {...rotation}
            drones[client.index - 1].position = {...position} 
            client.broadcast.emit('opponentPosition', {socket_id: client.id, position: client.position, rotation: client.rotation})
        })

        client.on('gunStart', () => {
            client.broadcast.emit('opponentGunStart', {socket_id: client.id})
        })

        client.on('gunStop', () => {
            client.broadcast.emit('opponentGunStop', {socket_id: client.id})
        })

        client.on('targetVector', ({targetVector}) => {
            client.broadcast.emit('opponentTargetVector', {socket_id: client.id, targetVector})
        })

        client.on('destroyDrone', ({socket_id}) => {
            client.broadcast.emit('opponentDestroyDrone', {socket_id})
        })

        client.on('explodeDrone', ({socket_id}) => {
            client.broadcast.emit('opponentExplodeDrone', {socket_id})
        })
        
        client.on('smokeDrone', ({socket_id}) => {
            client.broadcast.emit('opponentSmokeDrone', {socket_id})
        })

        client.on('respawnDrone', ({position}) => {
            client.position = {...position}
            if (drones[client.index - 1]) {
                drones[client.index - 1].position = {...position}
                client.broadcast.emit('opponentRespawnDrone', {socket_id: client.id, position})
            }
        })

        client.on('keydown', ({moveVector, rotationVector, position, rotation, velocity}) => {
            client.position = {...position}
            client.rotation = {...rotation}
            if (drones[client.index - 1]) {
                drones[client.index - 1].position = {...position} 
                client.broadcast.emit('opponentKeydown', {socket_id: client.id, moveVector, rotationVector, position, rotation, velocity})
            }
        })

        client.on('keyup', ({moveVector, rotationVector, position, rotation, velocity}) => {
            client.position = {...position}
            client.rotation = {...rotation}
            if (drones[client.index - 1]) {
                drones[client.index - 1].position = {...position} 
                client.broadcast.emit('opponentKeyup', {socket_id: client.id, moveVector, rotationVector, position, rotation, velocity})
            }
        })
    })
}

import setupBot from "./bot.js"
setupBot()

export default mainsocket
