const jwt = require("jsonwebtoken");
const {Author, Token} = require("../models/author");

const auth = async (req, res, next) => {
    try{
        const token = req.cookies.jwt;
        const verifyAuthor = jwt.verify(token, process.env.SECRET_KEY);
        const author = await Author.findOne({_id:verifyAuthor._id});
        next();
    }catch(err){
        res.status(401).render("index", {status: "notLoggedIn", welcome: null});
    }
}

module.exports = auth;