import {
  Vector3,
  Clock,
  Raycaster,
  Object3D,
  Euler,
  Quaternion,
  MathUtils
} from 'three'
import { scene, camera, loops, drone } from '../index'
import PubSub from '../events'
import { triggerExplosion } from '../particles'
import socket from '../socket/main'

let dronesArray = []

let droneFactory = {
  ready: false
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const initDroneFactory = (msg, data) => {
  droneFactory = () => {
    const drone = data.mesh.clone()
    drone.up.set(0, 0, 1)
    drone.rotation.x = 0
    drone.scale.set(0.1, 0.1, 0.1)
    drone.name = `drone-${drone.id}`
    return drone
  }
  droneFactory.ready = true
  PubSub.publish('x.drones.factory.ready')
}
PubSub.subscribe('x.assets.drone.loaded', initDroneFactory)




const buildPilotDrone = () => {
  const pilotDrone = droneFactory()
  pilotDrone.gunClock = new Clock(false)
  pilotDrone.userData.altitude = NaN
  pilotDrone.userData.speed = 0
  pilotDrone.userData.lastPosition = pilotDrone.position.clone()
  pilotDrone.layers.enable(1)
  camera.position.set(getRandomInt(-1000, 1000), getRandomInt(-1000, 1000), getRandomInt(300, 400))
  scene.add(pilotDrone)
  window.pilotDrone = pilotDrone
  let localY
  let targetPosition
  let targetPositionFinal
  let camVec = new Vector3()
  const raycaster = new Raycaster()
  const downVector = new Vector3(0, 0, -1)
  const offsetVector = new Vector3(0, 0, 100)
  let terrainTiles
  let lastTimestamp = 0
  socket.on('droneId', ({socket_id}) => {
    pilotDrone.socket_id = socket_id
  })

  socket.emit('getId', {position: camera.position, rotation: camera.rotation})
  var c = 0;

  const pilotDroneLoop = (timestamp, delta) => {
    if (timestamp % 516 == 0) {
      
    } 

    camVec = camera.getWorldDirection(camVec)
    targetPosition = camera.position.clone()
      .add(camVec.multiplyScalar(20))
    localY = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
    targetPositionFinal = targetPosition.sub(localY.multiplyScalar(8))
    pilotDrone.position.copy(targetPositionFinal)
    pilotDrone.lookAt(targetPosition
      .add(camVec)
      .add({ x: 0, y: 0, z: 60 })
    )
      // if (c%50 === 0) {
      //   socket.emit('position', {position: pilotDrone.position, rotation: pilotDrone.rotation})
      //   c = 0;
      // }
      // c++;

    // velocity computation
    pilotDrone.userData.velocity = pilotDrone.position.clone()
      .sub(pilotDrone.userData.lastPosition)
      .multiplyScalar(1000 / delta)
      
    pilotDrone.userData.speed = pilotDrone.userData.velocity.length()
    pilotDrone.userData.lastPosition.copy(pilotDrone.position)

    // altitude computation
    if (timestamp - lastTimestamp > 200) {
      lastTimestamp = timestamp
      raycaster.set(pilotDrone.position.clone().add(offsetVector), downVector)
      terrainTiles = raycaster.intersectObjects(
        camera.userData.terrainTileUnder && camera.userData.terrainTileUnder.geometry ? [camera.userData.terrainTileUnder] : []
      )
      if (terrainTiles.length > 0) {
        pilotDrone.userData.altitude = terrainTiles[0].distance - offsetVector.length()
        pilotDrone.userData.groundNormal = terrainTiles[0].face.normal
      } else {
        pilotDrone.userData.altitude = NaN
      }
      if (pilotDrone.userData.altitude < 5) {
        PubSub.publish('x.drones.explode.pilotDrone', pilotDrone)
        PubSub.publish('x.drones.collision.terrain.pilotDrone', pilotDrone.userData.groundNormal)
      }
    }
  }
  loops.push(pilotDroneLoop)
  PubSub.publish('x.drones.pilotDrone.loaded', { pilotDrone })
  
  socket.on('opponentDestroyDrone', ({socket_id}) => {
    if (pilotDrone.socket_id === socket_id) {
      PubSub.publish('x.drones.selfDestroy', pilotDrone)
    }
  })

  socket.on('opponentSmokeDrone', ({socket_id}) => {
    if (pilotDrone.socket_id === socket_id) {
      // PubSub.publish('x.drones.smoke.start', pilotDrone)
    }
  })

  socket.on('opponentExplodeDrone', ({socket_id}) => {
    if (pilotDrone.socket_id === socket_id) {
      PubSub.publish('x.drones.explode', pilotDrone)
    }
  })
}
PubSub.subscribe('x.drones.factory.ready', buildPilotDrone)




const spawnDrone = (circle = true, phase = 0, socket_id, position) => {
  const drone = droneFactory()
  dronesArray.push(drone)
  drone.lockClock = new Clock(false)
  drone.userData.life = 100
  drone.socket_id = socket_id
  scene.add(drone)
  drone.lastPosition = drone.position.clone()
  drone.velocity = new Vector3()
  
  drone.moveVector = new Vector3(0, 0, 0)
  drone.rotationVector = new Vector3(0, 0, 0)
  const camVec = new Vector3()
  var acceleration = 100
  var rollSpeed = 0.001
  const tmpQuaternion = new Quaternion()
  drone.position.set(position ? position.x : 0, position ? position.y : 0, position ? position.z : 0)

  const droneLoop = (timestamp, delta) => {
    // if (!drone) return
    // const radius = 300
    // if (circle) {
    //   drone.position.set(
    //     radius * Math.cos(timestamp / 1000 / 3 + phase),
    //     radius * Math.sin(timestamp / 1000 / 3 + phase),
    //     300 + 50 * Math.cos(timestamp / 1000 + phase)
    //   )
    // } else {
    //   drone.position.copy(camera.position.clone()
    //     .add(camera.getWorldDirection(camVec).multiplyScalar(100)))
    // }
    //
    
    var rotMult = delta * rollSpeed

    var deltaVelocity = drone.moveVector.clone().multiplyScalar(
      delta / 1000 * acceleration
    )
    drone.velocity.sub(
      drone.velocity.clone().multiplyScalar(
        Math.max(
          1,
          deltaVelocity.length() ? 1 : 100 / (drone.velocity.length() + 1)
        ) * 0.01 * delta / 16.67
      )
    ).add(deltaVelocity)

    var deltaPosition = drone.velocity.clone().multiplyScalar(delta / 1000)
    drone.position.add(deltaPosition.applyQuaternion(drone.quaternion))

    tmpQuaternion.set(drone.rotationVector.x * rotMult, drone.rotationVector.y * rotMult, drone.rotationVector.z * rotMult, 1).normalize()
    drone.quaternion.multiply(tmpQuaternion)
    // expose the rotation vector for convenience
    drone.rotation.setFromQuaternion(drone.quaternion, "XYZ")
    
    //
    // drone.velocity = drone.position.clone().sub(drone.lastPosition).multiplyScalar(1000 / delta)
    drone.lastPosition = drone.position.clone()
    if (!drone.destroyed && drone.userData.life <= 50 && !drone.smoking) {
      PubSub.publish('x.drones.smoke.start', drone)
      socket.emit('smokeDrone', {socket_id: drone.socket_id})
    }
    if (!drone.destroyed && drone.userData.life <= 0) {
      PubSub.publish('x.drones.destroy', drone)
      socket.emit('explodeDrone', {socket_id: drone.socket_id})
      socket.emit('destroyDrone', {socket_id: drone.socket_id})
      drone.destroyed = true
      triggerExplosion(drone)
    }
  }

  socket.on('removeOpponentDrone', ({socket_id}) => {
    if (socket_id === drone.socket_id) {
      PubSub.publish('x.drones.destroy', drone)
      dronesArray = dronesArray.filter((drone) => drone.socket_id !== socket_id)
    }
  })

  socket.on('opponentDestroyDrone', ({socket_id}) => {
    if (drone.socket_id === socket_id) {
      PubSub.publish('x.drones.destroy', drone)
    }
  })

  socket.on('opponentSmokeDrone', ({socket_id}) => {
    if (drone.socket_id === socket_id) {
      PubSub.publish('x.drones.smoke.start', drone)
    }
  })

  socket.on('opponentExplodeDrone', ({socket_id}) => {
    if (drone.socket_id === socket_id) {
      PubSub.publish('x.drones.explode', drone)
    }
  })

  // socket.on('opponentPosition', ({socket_id, position, rotation}) => {
  //   if (socket_id === drone.socket_id) {
  //     newpos.set(position.x, position.y, position.z)
  //     newrot.set(rotation._x, rotation._y, rotation._z)
  //     m = 29;
  //     n = 1;
  //     //drone.position.set(position.x, position.y, position.z)
  //     //drone.rotation.set(rotation._x, rotation._y, rotation._z)
  //   }
  // })

  socket.on('opponentKeydown', ({socket_id, moveVector, rotationVector, position, rotation, velocity}) => {
    if (drone.socket_id === socket_id) {
      drone.moveVector.set(moveVector.x, moveVector.y, moveVector.z)
      drone.rotationVector.set(rotationVector.x, rotationVector.y, rotationVector.z)
      drone.position.set(position.x, position.y, position.z)
      drone.rotation.set(rotation._x, rotation._y, rotation._z)
      drone.velocity.set(velocity.x, velocity.y, velocity.z)
    }
  })

  socket.on('opponentKeyup', ({socket_id, moveVector, rotationVector, position, rotation, velocity}) => {
    if (drone.socket_id === socket_id) {
      drone.moveVector.set(moveVector.x, moveVector.y, moveVector.z)
      drone.rotationVector.set(rotationVector.x, rotationVector.y, rotationVector.z)
      drone.position.set(position.x, position.y, position.z)
      drone.rotation.set(rotation._x, rotation._y, rotation._z)
      drone.velocity.set(velocity.x, velocity.y, velocity.z)
    }
  })

  socket.on('opponentGunStart', ({socket_id}) => {
    if (socket_id === drone.socket_id) {
      alert('gun')
      PubSub.publishSync('x.drones.gun.start2', drone)
    }
  })

  socket.on('opponentGunStop', ({socket_id}) => {
    if (socket_id === drone.socket_id) {
      PubSub.publishSync('x.drones.gun.stop', drone)
    }
  })

  socket.on('opponentTargetVector', ({socket_id, targetVector}) => {
    if (socket_id === drone.socket_id) {
      drone.targetVector = targetVector
    }
  })

  socket.on('opponentRespawnDrone', ({socket_id, position}) => {
    if (socket_id === drone.socket_id) {
      //dronesArray.push(drone)
      drone.userData.life = 100
      drone.destroyed = false
      drone.smoking = false
      scene.add(drone)
      drone.position.set(position.x, position.y, position.z)
      dronesArray.forEach((drone) => {
        PubSub.publish('x.hud.register.target', drone)
      })
    }
  })

  PubSub.publish('x.hud.register.target', drone)
  loops.push(droneLoop)
}




// const spawnBotDrone = (position, moveVector) => {
//   const drone = droneFactory()
//   drone.lockClock = new Clock(false)
//   drone.userData.life = 100
//   scene.add(drone)
//   drone.lastPosition = drone.position.clone()
//   drone.velocity = new Vector3(moveVector.x, moveVector.y, moveVector.z).normalize() * 20;
//   const camVec = new Vector3()
  
//   const droneLoop = (timestamp, delta) => {
//     if (!drone) return

//     drone.position.set(position.x, position.y, position.z)

//     if (!drone.destroyed && drone.userData.life <= 50 && !drone.smoking) {
//       PubSub.publish('x.drones.smoke.start', drone)
//     }
//     if (!drone.destroyed && drone.userData.life <= 0) {
//       PubSub.publish('x.drones.destroy', drone)
//       drone.destroyed = true
//       triggerExplosion(drone)
//     }
//   }

//   PubSub.subscribe('x.drones.destroy', (msg, deadDrone) => {
//     if (deadDrone.id === drone.id) {
//       PubSub.publish('x.loops.remove', droneLoop)
//     }
//   })
//   PubSub.publish('x.hud.register.target', drone)
//   loops.push(droneLoop)
// }




const initTargets = () => {
  socket.on('initDrones', ({opponentDrones}) => {
    opponentDrones.forEach((ele) => {
      spawnDrone(false, 0, ele.socket_id, ele.position)
    })
  })

  // socket.on('botDrones', ({bots}) => {
  //   bots.forEach((ele) => {
  //     spawnBotDrone(ele.position, ele.moveVector)
  //   })
  // })
  
  socket.on('newOpponentDrone', ({newDrone}) => {
      spawnDrone(false, 0, newDrone.socket_id, newDrone.position)
  })

  socket.emit('getDrones', {})
}
PubSub.subscribe('x.drones.factory.ready', initTargets)


PubSub.subscribe('x.drones.selfDestroy', (msg, pilotDrone) => {
  scene.remove(pilotDrone)
  pilotDrone.smoking = false
  setTimeout(() => {
    camera.position.set(getRandomInt(-1000, 1000), getRandomInt(-1000, 1000), getRandomInt(300, 400))
    scene.add(pilotDrone)
    socket.emit('respawnDrone', {position: camera.position})
    dronesArray.forEach((drone) => {
      PubSub.publish('x.hud.register.target', drone)
    })
  }, 2000)
})


export default initDroneFactory
