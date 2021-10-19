import * as EthereumController from "@decentraland/EthereumController"

let eth = EthereumController

function payment(){
  executeTask(async () => {
    try {
      await eth.requirePayment('0xB2223F4038DEf8A62a86E3c4b108CDfE00a74C4f', 9999, 'ETH')

    } catch {
      log("failed process payment")
    }
  })
}

const logo = new Entity();
engine.addEntity(logo);
logo.addComponent(new GLTFShape("models/logo.glb"));
logo.addComponent(new Transform({ position: new Vector3(41, 0, 42.25), scale: new Vector3(4, 4, 4) }));

logo.addComponent(
  new OnPointerDown(() => {
    openExternalURL("https://plasm.network")
  },
    { hoverText: "Visit the astar website to learn more)",
    distance: 30, }
)
)

const wall = new Entity();
engine.addEntity(wall);
wall.addComponent(new GLTFShape("models/walls2.glb"));
wall.addComponent(new Transform({ position: new Vector3(0, 0, 0) }));


class SimpleRotate implements ISystem {
  update() {
    let transform = (logo.getComponent(Transform))
    transform.rotate(Vector3.Up(), 1)
  }
}

engine.addSystem(new SimpleRotate())

const polkadot = new Entity();
engine.addEntity(polkadot);
polkadot.addComponent(new GLTFShape("models/eth.glb"));
polkadot.addComponent(new Transform({ position: new Vector3(75, 0, 5), scale: new Vector3(4, 4, 4)  }));

polkadot.addComponent(
  new OnPointerDown(() => {
    openExternalURL("https://shiden.subscan.io/account/YourAddressForConfirmation")
    payment()
  },
    { hoverText: "Send ETH and recieve wETH on shiden network. (NOT ACTUALLY WORKING)",
    distance: 30, }
)
)

const ethswap = new Entity();
engine.addEntity(ethswap);
ethswap.addComponent(new GLTFShape("models/sdn.glb"));
ethswap.addComponent(new Transform({ position: new Vector3(55, 0, 5), scale: new Vector3(4, 4, 4)  }));

ethswap.addComponent(
  new OnPointerDown(() => {
    openExternalURL("https://shiden.subscan.io/account/W8bwUPJssNzhq7yqgj2qX2As9Bx5K9Laa9zJHsrAPhkCYon")
    const messageToSign = `# DCL Signed message
Attacker: 10
Defender: 123
Timestamp: 1512345678`

let eth = EthereumController

executeTask(async () => {
  const convertedMessage = await eth.convertMessageToObject(messageToSign)
  const { message, signature } = await eth.signMessage(convertedMessage)
  log({ message, signature })
})
  },
    { hoverText: "Click here to receive a free wearable on SHIDEN",
    distance: 30, }
)
)

export function requirePayment(arg0: number, arg1: number, arg2: string) {
  throw new Error("Function not implemented.");
}
