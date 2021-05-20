const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true
    },
    desc: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const bookSchema = new mongoose.Schema({
    bookTitle: {
        type: String,
        required: true
    },
    bookDesc: {
        type: String,
        required: true
    },
    covPicPath: {
        type: String,
        required: true
    },
    pdfPath: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    comments: [commentSchema]
});

const blogSchema = new mongoose.Schema({
    blogTitle: {
        type: String,
        required: true
    },
    blogDesc: {
        type: String,
        required: true
    },
    blogMarkdown: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const tokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true
    }
});

const authorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    books: [bookSchema],
    blogs: [blogSchema],
    tokens: [tokenSchema]
});

const author = new mongoose.model("author", authorSchema);
const book = new mongoose.model("book", bookSchema);
const blog = new mongoose.model("blog", blogSchema);
const token = new mongoose.model("token",tokenSchema);
const comment = new mongoose.model("comment", commentSchema);

module.exports.Author = author;
module.exports.Book = book;
module.exports.Blog = blog;
module.exports.Token = token;
module.exports.Comment = comment;