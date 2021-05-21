require("./db/connection");
const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cookieParser = require('cookie-parser');
const multer = require("multer");
require('dotenv').config();
const {Author, Book, Blog, Token, Comment} = require("./models/author");
const auth = require("./middleware/auth");
//const { nextTick } = require("process");

const staticPath = path.join(__dirname, "public");
const viewsPath = path.join(__dirname, "templates/views");

app.set("views", viewsPath);
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(express.static(staticPath));
app.use(cookieParser());
app.use(express.json());

var uniqueNo;
const unique = (req,res,next) => {
    uniqueNo = Date.now();
    next();
}

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if(file.fieldname == "coverPic"){
            cb(null, 'public/uploads/coverPics');
        }
        else{
            cb(null, 'public/uploads/bookPdfs');
        }
    },
    filename: function (req, file, cb) {
        cb(null, `${uniqueNo}${path.extname(file.originalname)}`)
    }
});
var upload = multer({ storage: storage });

//Use to Render the Home Page
app.get("/", (req,res) => {
    res.render("index", {status: "notLoggedIn", welcome: null});
});

//Use to Render the Register Page
app.get("/register", (req,res) => {
    res.render("register", {message: null, status: "notLoggedIn"});
});

//Use to Add Data of Author to Database (POST Route)
app.post("/register", async (req,res) => {
    try{
        if(req.body.password != req.body.conPassword)
        {
            return res.render("register", { message: "Password doesn't match", status: "notLoggedIn"});
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const register = new Author({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
        });

        const registerUser = await register.save();
        //console.log(registerUser);
        res.status(201).render("index", {status: "notLoggedIn", welcome: null});
    }
    catch (err) {
        res.status(400).render("register", {message: "This Email is already Registered", status: "notLoggedIn"});
    }
});

//Use to render the Login Page
app.get("/login", (req,res) => {
    res.render("login", {message: null, status: "notLoggedIn"});
});

//Use to Login into Particular User (POST Route)
app.post("/login", async (req,res) => {
    try{
        const email = req.body.email;
        const password = req.body.password;

        const authorData = await Author.findOne({email:email});
        const check = await bcrypt.compare(password, authorData.password);
        
        if(check == true){
            const token = await jwt.sign({ _id: authorData._id }, process.env.SECRET_KEY);
            const newToken = new Token({
                token:token
            });
            authorData.tokens[0] = newToken;
            authorData.save();

            res.cookie("jwt", token, { expires:new Date(Date.now() + 253402300000000), httpOnly:true });
            res.cookie("email", authorData.email, { expires:new Date(Date.now() + 253402300000000), httpOnly:true });

            return res.status(201).render("index", {status: "loggedIn", welcome: "Welcome"});
        }
        res.render("login", {message: "Incorrect Password", status: "notLoggedIn"});
    }catch(err){
        console.log(err);
        res.status(400).render("login", {message: "Invalid Email", status: "notLoggedIn"});
    }
});

//Use to Logout 
app.get("/logout", auth, async(req,res) => {
    try{    
        res.clearCookie("jwt");
        res.clearCookie("email");    
        res.render("index", {status: "notLoggedIn", welcome: null});
    } catch (err) {
        res.status(500).send(err);
    }
});

//Use to render MyBooks Page in Sorted Way (Descending Order) (Can be Accessible by LoggedIn Author)
app.get("/mybooks", auth, async (req,res) => {
    const authorData = await Author.findOne({email:req.cookies.email});
    authorData.books.sort(compareByCreatedAt);
    res.render("myBooks", {status: "loggedIn", books: authorData.books});
    function compareByCreatedAt(a, b) {
        if (a.createdAt > b.createdAt) return -1;
        else if (a.createdAt < b.createdAt) return 1;
        else return 0;
    }
});

//Use to render newBook Page where we can Add Book 
app.get("/addbook", auth, (req,res) => {
    res.render("newBook", {status:"loggedIn", book: null});
});

//Use to Add Book to the Database for that particular LoggedIn Author (POST Route)
var cpUpload = upload.fields([{name: 'coverPic', maxCount: 1}, {name: 'bookDoc', maxCount: 1}])
app.post("/mybooks", unique, cpUpload, async (req,res) => {
    try{
        var coverPic = '/uploads/coverPics/'+ uniqueNo + path.extname(req.files['coverPic'][0].originalname);
        var bookDoc = '/uploads/bookPdfs/'+ uniqueNo + path.extname(req.files['bookDoc'][0].originalname);
        const bookData = new Book({
            bookTitle: req.body.bookTitle,
            bookDesc: req.body.bookDesc,
            covPicPath: coverPic,
            pdfPath: bookDoc
        });
        const authorData = await Author.findOne({email:req.cookies.email});
        authorData.books.push(bookData);
        await authorData.save();
        res.status(201).redirect("/mybooks");
    }catch(err){
        console.log(err);
        res.status(501).redirect("/mybooks");
    }
});

//Use to Delete Own Book, can be Deleted by that LoggedIn Author (POST Route)
app.post("/books/:id", async (req,res) => {
    try {
        const bookID = req.params.id;
        const userEmail = req.cookies.email;
        const bookData = await Author.find({ email: userEmail }, { 'books': { $elemMatch: { "_id": bookID } } });
        await Author.updateOne({ email: userEmail }, { '$pull': { 'books': { "_id": bookID } } });
    
        function deleteFiles(files){
            files.forEach(function(filepath){
                fs.unlink(filepath, () => {
                    console.log("File Deleted");
                });
            });
        }
        const picPath = "public/" + bookData[0].books[0].covPicPath;
        const pdfPath = "public/" + bookData[0].books[0].pdfPath;
        var files = [picPath, pdfPath];
        deleteFiles(files);
        res.status(200).redirect("/mybooks");
    }catch(err){
        console.log(err);
        res.status(500).redirect("/mybooks");
    }
});

//Use to View Own Book by that LoggedIn Author
app.get("/viewbook/:id", auth, async (req,res) => {
    try{
        const bookId = req.params.id;
        const userEmail = req.cookies.email;
        const bookData = await Author.find({ email: userEmail }, { 'books': { $elemMatch: { "_id": bookId } } });
        //console.log(bookData[0].books[0]);
        res.status(200).render("viewBook", { status: "loggedIn", book: bookData[0].books[0] });
    }catch(err){
        console.log(err);
        res.status(500).redirect("/mybooks");
    }
});

//Use to View Book by any User
app.get("/viewbook/:email/:id", async (req,res) => {
    try{
        const bookId = req.params.id;
        const userEmail = req.params.email;
        const bookData = await Author.find({ email: userEmail }, { 'books': { $elemMatch: { "_id": bookId } } });
        //console.log(blogData[0].blogs[0]);
        if(!req.cookies.jwt){
            return res.status(200).render("viewBook02", { status: "notLoggedIn", book: bookData[0].books[0], email:userEmail });
        }
        res.status(200).render("viewBook02", { status: "loggedIn", book: bookData[0].books[0], email:userEmail });
    }catch(err){
        res.status(500).redirect("/books");
    }
});

//Use to Download Own Book by LoggedIn Author
app.get("/downloadbook/:id", auth, async (req,res) => {
    try{
        const bookId = req.params.id;
        const userEmail = req.cookies.email;
        const bookData = await Author.find({ email: userEmail }, { 'books': { $elemMatch: { "_id": bookId } } });
        //console.log(bookData[0].books[0]);
        var x = "public/" + bookData[0].books[0].pdfPath;
        res.download(x, function(error){
            res.status(404).send(error);
        });  
    }catch(err){
        res.status(500).redirect(`/viewsbook/req.params.id`);
    }
});

//Use to Download Book by any User
app.get("/downloadbook/:email/:id", async (req,res) => {
    try{
        const bookId = req.params.id;
        const userEmail = req.params.email;
        const bookData = await Author.find({ email: userEmail }, { 'books': { $elemMatch: { "_id": bookId } } });
        //console.log(bookData[0].books[0]);
        var x = "public/" + bookData[0].books[0].pdfPath;
        res.download(x, function(error){
            res.status(404).send(error);
        });  
    }catch(err){
        res.status(500).redirect(`/viewbook/req.params.email/req.params.id`);
    }
});

//Use to render MyBlogs Page in Sorted Way (Descending Order) (Can be Accessible by LoggedIn Author)
app.get("/myblogs", auth, async (req,res) => {
    try{
        const authorData = await Author.findOne({email:req.cookies.email});
        authorData.blogs.sort(compareByCreatedAt);
        res.render("myBlogs", {status: "loggedIn", blogs: authorData.blogs});
        function compareByCreatedAt(a, b) {
            if (a.createdAt > b.createdAt) return -1;
            else if (a.createdAt < b.createdAt) return 1;
            else return 0;
        }
    }catch(err){
        res.status(500).redirect("/");
    }
});

//Use to render newBlog Page where we can Add Blog
app.get("/addblog", auth, (req,res) => {
    res.render("newBlog", {status:"loggedIn", blog: null});
});

//Use to Delete Own Blog by LoggedIn Author
app.post("/blogs/:id", async (req,res) => {
    try {
        const blogID = req.params.id;
        const userEmail = req.cookies.email;
        await Author.updateOne({ email: userEmail }, { '$pull': { 'blogs': { "_id": blogID } } });
        res.status(200).redirect("/myblogs");
    }catch(err){
        res.status(500).redirect("/myblogs");
    }
});

//Use to Add Blog to Database by LoggedIn User
app.post("/myblogs", auth,  async (req,res) => {
    try{
        const authorBlog = new Blog({
            blogTitle: req.body.title,
            blogDesc: req.body.description,
            blogMarkdown: req.body.markdown
        });
        const authorData = await Author.findOne({email:req.cookies.email});
        authorData.blogs.push(authorBlog);
        await authorData.save();
        res.status(201).redirect("/myblogs");
    }catch(err){
        res.status(500).redirect("/myblogs");
    }
});

//Use to Edit Own Blog by LoggedIn Author
app.post("/myblogs/:id", auth,  async (req,res) => {
    try{
        const blogId = req.params.id;
        const userEmail = req.cookies.email;
        const blogData = await Author.updateOne({"email": userEmail, "blogs._id": blogId}, {
            $set:{
                "blogs.$.blogTitle": req.body.title,
                "blogs.$.blogDesc": req.body.description,
                "blogs.$.blogMarkdown": req.body.markdown
            }
        });
        res.status(201).redirect("/myblogs");
    }catch(err){
        res.status(500).redirect("/myblogs");
    }
});

//Use to View Own Blog by LoggedIn Author
app.get("/viewblog/:id", auth, async (req,res) => {
    try{
        const blogId = req.params.id;
        const userEmail = req.cookies.email;
        const blogData = await Author.find({ email: userEmail }, { 'blogs': { $elemMatch: { "_id": blogId } } });
        //console.log(blogData[0].blogs[0]);
        res.status(200).render("viewBlog", { status: "loggedIn", blog: blogData[0].blogs[0] });
    }catch(err){
        res.status(500).redirect("/myblogs");
    }
});

//Use to View Blog by Any User
app.get("/viewblog/:email/:id", async (req,res) => {
    try{
        const blogId = req.params.id;
        const userEmail = req.params.email;
        const blogData = await Author.find({ email: userEmail }, { 'blogs': { $elemMatch: { "_id": blogId } } });
        //console.log(blogData[0].blogs[0]);
        if(!req.cookies.jwt){
            return res.status(200).render("viewBlog02", { status: "notLoggedIn", blog: blogData[0].blogs[0] });
        }
        res.status(200).render("viewBlog02", { status: "loggedIn", blog: blogData[0].blogs[0] });
    }catch(err){
        res.status(500).redirect("/blogs");
    }
});

//Use to Render newBlog Page for Editing that particular Blog
app.get("/editblog/:id", auth, async (req,res) => {
    try{
        const blogId = req.params.id;
        const userEmail = req.cookies.email;
        const blogData = await Author.find({ email: userEmail }, { 'blogs': { $elemMatch: { "_id": blogId } } });
        //console.log(blogData[0].blogs[0]);
        res.status(200).render("newBlog", { status: "loggedIn", blog: blogData[0].blogs[0] });
    }catch(err){
        res.status(500).redirect("/myblogs");
    }
});

//Use to render Books Page in Sorted Way (Descending Order) (Accessible to all User)
app.get("/books", async (req,res) => {
    const allAuthors = await Author.find();
    const allBooks = [];
    var flagBook;

    allAuthors.forEach((author) => {
        const name = author.name;
        const email = author.email;
        author.books.forEach((book) => {
            flagBook = {};
            flagBook._id = book._id;
            flagBook.author = name;
            flagBook.email = email;
            flagBook.bookTitle = book.bookTitle;
            flagBook.bookDesc = book.bookDesc;
            flagBook.covPicPath = book.covPicPath;
            flagBook.pdfPath = book.pdfPath;
            flagBook.createdAt = book.createdAt;

            allBooks.push(flagBook);
        });
    });
    allBooks.sort((a, b) => b.createdAt - a.createdAt);

    if(req.cookies.email){
        return res.render("books", {status: "loggedIn", books: allBooks});
    }
    res.render("books", {status: "notLoggedIn", books: allBooks});
});

//Use to render Blogs Page in Sorted Way (Descending Order) (Accessible to all User)
app.get("/blogs", async (req,res) => {
    const allAuthors = await Author.find();
    const allBlogs = [];
    var flagBlog;

    allAuthors.forEach((author) => {
        const name = author.name;
        const email = author.email;
        author.blogs.forEach((blog) => {
            flagBlog = {};
            flagBlog._id = blog._id;
            flagBlog.author = name;
            flagBlog.email = email;
            flagBlog.blogTitle = blog.blogTitle;
            flagBlog.blogDesc = blog.blogDesc;
            flagBlog.blogMarkdown = blog.blogMarkdown;
            flagBlog.createdAt = blog.createdAt;

            allBlogs.push(flagBlog);
        });
    });
    allBlogs.sort((a, b) => b.createdAt - a.createdAt);

    if(req.cookies.email){
        return res.render("blogs", {status: "loggedIn", blogs: allBlogs});
    }
    res.render("blogs", {status: "notLoggedIn", blogs: allBlogs});
});

//Use to render Comment Page of that Particular Book which is Registered to Particular Email 
app.get("/comment/:email/:id", async (req,res) => {
    const bookId = req.params.id;
    const userEmail = req.params.email;
    const bookData = await Author.find({ email: userEmail }, { 'books': { $elemMatch: { "_id": bookId } } });
    //console.log(bookData[0].books[0].comments);
    bookData[0].books[0].comments.sort((a, b) => b.createdAt - a.createdAt);
    if(req.cookies.email){
        return res.render("comment", {status:"loggedIn", email: userEmail, bookId: bookId, comments: bookData[0].books[0].comments});
    }
    res.render("comment", {status:"notLoggedIn", email: userEmail, bookId: bookId, comments: bookData[0].books[0].comments});
});

//Use to render Add Comment Page where any User can Add Comment of that Particular Book which is Registered to Particular Email
app.get("/addcomment/:email/:id", (req,res) => {
    const bookId = req.params.id;
    const userEmail = req.params.email;
    if(req.cookies.email){
        return res.render("newComment", {status: "loggedIn", email: userEmail, bookId: bookId});
    }
    res.render("newComment", {status: "notLoggedIn", email: userEmail, bookId: bookId});
});

//Use to Add Comment to that Particular Book which is Registered to Particular Email (POST Route)
app.post("/addcomment/:email/:id", async (req,res) => {
    const commentData = new Comment({
        email: req.body.email,
        desc: req.body.desc
    });
    const bookId = req.params.id;
    const userEmail = req.params.email;
    
    const author = await Author.findOne({ email: userEmail });
   
    const restBooks = author.books.filter((book) => book._id != bookId);
    const targetBook = author.books.filter((book) => book._id == bookId);
    
    targetBook[0].comments.push(commentData);
    restBooks.push(...targetBook);
    //console.log(restBooks[0].comments);
    author.books = restBooks;
    await author.save();

    return res.redirect(`/comment/${userEmail}/${bookId}`);
});

//Use to Delete the Complete Database (!!Danger)
app.get("/delete",(req,res) => {
    Author.deleteMany().then(() => res.send("All Author Deleted"))
    .catch((err) => res.send(err));
});

//Use to render 404Error Page when User want to access unknown Route
app.get('*', (req,res) => {
	res.status(404).render("404Error", { errMessage: 'Oops! Page not Found'});
});

const port = process.env.PORT || 3000;
app.listen(port, (err) => {
    if(!err){
        console.log(`Server listening at port ${port}`);
    }else{
        console.log("Something went Wrong");
    }
});