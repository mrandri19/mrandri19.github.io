$(function() {
    $.get("https://api.github.com/users/mrandri19/repos", function(data) {
        $("#repos .loading").hide();
        data.map(function(repo) {
            var a = document.createElement("a")
            a.setAttribute("href", repo.html_url)
            a.innerText = repo.name

            var li = document.createElement("li")
            li.appendChild(a)
            $("#repos").append(li)
        })
    })
})
