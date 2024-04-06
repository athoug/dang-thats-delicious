// we need a couple of packages to send emails
// first one is node mailer (which will interface with the SMTP)
const nodemailer = require('nodemailer');
// we will also need the pug package (to template the email)
const pug = require('pug');
const juice = require('juice'); // a library to take your html and style and make the style inline
const htmlToText = require('html-to-text'); // a library to turn your html into basic text format
const promisify = require('es6-promisify');

// we will first need to create a transports
// a transport is a way to interface with different ways of sending email SMTP is the most common
const transport = nodemailer.createTransport({
	host: process.env.MAIL_HOST,
	port: process.env.MAIL_PORT,
	auth: {
		user: process.env.MAIL_USER,
		pass: process.env.MAIL_PASS,
	},
});

// testing if it works
// transport.sendMail({
// 	from: 'Athoug <athoug.s@gmail.com>',
// 	to: 'randy@example.com',
// 	subject: 'just trying things out',
// 	html: 'hey I <strong>love</strong> you',
// 	text: 'hey I **love** you',
// });

// the reason this is a normal variable not an export is because we don't need it outside of this file
// so we wont be exposing it elsewhere
const generateHTML = (filename, options = {}) => {
	// so we run into a problem that our disk doesn't really know where files
	// are located, and to resolve that we user a variable available for us called __dirname
	// this will take me to my current directory, in this case the handlers folder
	const html = pug.renderFile(
		`${__dirname}/../views/email/${filename}.pug`,
		options
	);

	const inlined = juice(html);
	return inlined;
};

exports.send = async (options) => {
	// we setup the emil options
	const html = generateHTML(options.filename, options);
	const text = htmlToText.fromString(html);

	const mailOptions = {
		from: `Athoug sug <noreplay@athoug.com>`,
		to: options.user.email,
		subject: options.subject,
		html,
		text,
	};

	// we promisify our send mail function
	const sendMail = promisify(transport.sendMail, transport);

	return sendMail(mailOptions);
};
