const nodemailer = require('nodemailer')
const pug = require('pug')
const HtmlToText = require('html-to-text')

module.exports = class Email {
    constructor(user, url) {
        this.to = user.email
        this.firstName = user.name.split(' ')[0]
        this.url = url
        this.from = `Momo Mochi ${process.env.EMAIL_FROM}`
    }

    newTransport() {
        if (process.env.NODE_ENV === 'production') {
            // return nodemailer.createTransport({
            //     service: 'SendinBlue',
            //     // host: process.env.SIB_HOST,
            //     // port: process.env.SIB_PORT,
            //     auth: {
            //         user: process.env.SIB_USERNAME,
            //         pass: process.env.SIB_PASSWORD
            //     }
            // })
            //return nodemailer.createTransport(new Transport({ apiKey: process.env.SIB_API_KEY }))
        }
        // return nodemailer.createTransport({
        //     host: process.env.EMAIL_HOST,
        //     port: process.env.EMAIL_PORT,
        //     auth: {
        //         user: process.env.EMAIL_USERNAME,
        //         pass: process.env.EMAIL_PASSWORD
        //     }
        // });
        //return nodemailer.createTransport(new Transport({ apiKey: process.env.SIB_API_KEY }))
    }
    async send(template, subject) {
        const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
            firstName: this.firstName,
            url: this.url,
            subject
        })

        const mailOptions = {
            from: this.from,
            to: this.to,
            subject,
            html,
            text: HtmlToText.fromString(html)
        }
        await this.newTransport().sendMail(mailOptions)
    }

    async sendWelcome() {
        await this.send('welcome', 'Welcome to site!')
    }
    async sendPasswordRs() {
        await this.send('passwordRs', 'Your password reset token (valid for only 10 mins)!')
    }
}