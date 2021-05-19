var logged = document.getElementsByClassName('notLoggedIn');
if (logged.length > 0) {
    document.querySelector(".register").style.visibility = "visible";
    document.querySelector(".login").style.visibility = "visible";
    document.querySelector(".logout").remove();
    document.querySelector(".mybooks").remove();
    document.querySelector(".myblogs").remove();
}
else{
    document.querySelector(".register").remove();
    document.querySelector(".login").remove();
    document.querySelector(".logout").style.visibility = "visible";
    document.querySelector(".mybooks").style.visibility = "visible";
    document.querySelector(".myblogs").style.visibility = "visible";
    var element = document.getElementById("home")
    element.classList.add("disabled");
}