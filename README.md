# To view this scene.

Requirements:

- Node.js 10+
- The Decentraland CLI (installed globally)

Install the Decentraland CLI (recommended to use the same release as this project):

    npm install -g decentraland@next

Then clone and run the project:

    git clone https://github.com/ERC20s/ASTAR.git
    cd ASTAR
    npm install
    npm start

npm start runs the project's "dcl start" script. The project's Dockerfile runs the same command with extra CI flags ("npm start -- --ci").
