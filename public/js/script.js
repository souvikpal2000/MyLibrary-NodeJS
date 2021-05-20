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

function findBook(){
    let filter = document.getElementById('myInput').value.toUpperCase();
    let books = document.querySelectorAll(".book");
    for(i=0;i<books.length;i++){
        let book = books[i].querySelector(".bookDetails");
        let bookTitle = book.querySelector(".card-title");
        if(bookTitle){
            let bookName = bookTitle.textContent || bookTitle.innerHTML;
            if(bookName.toUpperCase().indexOf(filter) > -1){
				books[i].style.display = "";
			}
			else{
				books[i].style.display = "none";
			}
        }
    }
}