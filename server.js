const mongoose = require('mongoose')
const dotenv = require('dotenv')

process.on('uncaughtException', err => {
    console.log(err.name, err.message);
    console.log('Uncaught Exception! Server close!!!!!!!!');
    process.exit(1)
})

dotenv.config({ path: './config.env' })
const app = require('./app')

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)
mongoose.connect(DB, {
    useNewUrlParser: true,
}).then(() => console.log('DB connect!'))


// start server
const port = process.env.PORT || 3000
const server = app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})

process.on('unhandleRejection', err => {
    console.log(err.name, err.message);
    console.log('Unhandle Rejection! Server close!!!!!!!!');
    server.close(() => {
        process.exit(1)
    })
})

