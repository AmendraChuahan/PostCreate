
require('dotenv').config();

const express = require('express');
const app = express();
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const userModel = require("./models/user");
const postModel = require("./models/post");
const user = require('./models/user');


const PORT = process.env.PORT;

app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());

//database connect

mongoose.connect(process.env.MONGO_URL).then(()=>console.log("mongodb connected"));

app.get('/',function (req,res){
    res.render("index");
});
app.get('/login', function (req,res){
  res.render("login");
});
app.get('/profile',isLoggedIn,async  function (req,res){
   let user = await userModel.findOne({email: req.user.email}).populate("posts");
   
   console.log(user.posts);
   
   
  res.render("profile",{user});
});
app.get('/like/:id',isLoggedIn,async  function (req,res){
  let post = await postModel.findOne({_id: req.params.id}).populate("user");

if(post.likes.indexOf(req.user.userid)===-1){
  post.likes.push(req.user.userid);
}
else{
       post.likes.splice(post.likes.indexOf(req.user.userid),1)// splice mean remove karna
}

  
 await post.save();
  res.redirect("/profile");
  
  

});
app.get('/edit/:id',isLoggedIn,async  function (req,res){
  let post = await postModel.findOne({_id: req.params.id}).populate("user");
   res.render("edit",{post});

});

app.post('/update/:id',isLoggedIn,async  function (req,res){
  let post = await postModel.findOneAndUpdate({_id: req.params.id},{content:req.body.content})
   res.redirect("/profile");

});
app.get('/delete/:id',isLoggedIn,async  function (req,res){
  let post = await postModel.findOneAndDelete({_id: req.params.id},{content:req.body.content})
   res.redirect("/profile");

});

app.post('/post',isLoggedIn,async  function (req,res){
  let user = await userModel.findOne({email: req.user.email});
  let{content}=req.body;
  
   let post= await postModel.create({
    user:user._id,
    content:content
  });
  user.posts.push(post._id);
   await user.save();
   res.redirect("/profile")
});


app.post('/register',  async function (req,res){
  let {email,password,username,name,age} = req.body;
 let user =  await userModel.findOne({email});
 if(user) return res.status(400).send("user already registerd");

 bcrypt.genSalt(10,(err,salt)=>{
bcrypt.hash(password,salt, async (err,hash) =>{
   let user = await userModel.create({
    username,email,age, name,password:hash
  });
   let token = jwt.sign({email:email, userid:user._id},"shhh");
   res.cookie("token",token);
   res.render("profile");
})
 })
 
});
app.post('/login',  async function (req,res){
  let {email,password} = req.body;
 let user =  await userModel.findOne({email});
 if(!user) return res.status(400).send("Something went wrong");
 bcrypt.compare(password,user.password , function (err,result){
  if(result){
    let token = jwt.sign({email:email, userid:user._id},"shhh");
    res.cookie("token",token);
    res.status(200).redirect("/profile");
  } 
  else res.redirect("/login");
  
 })

 
});
app.get('/logout',(req,res)=>{
  res.cookie("token","");
  res.redirect('/login')
})
function isLoggedIn(req,res,next){
 if(req.cookies.token ==="") res.redirect("/login");
 else{
  let data = jwt.verify(req.cookies.token,"shhh");
  req.user = data;
 next();
 }
}




app.listen(PORT,()=>console.log("server is connected to port:",PORT));