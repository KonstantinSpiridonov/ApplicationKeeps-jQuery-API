// проверяет, что пользователь авторизован и если это не так, переводит на страницу входа
auth.onAuthStateChanged(user => {
    if (user) console.log('user is signed in at users.html')
    else {
        alert('your login session has expired or you have logged out')
        location = 'login.html'
    }
})

// отвечает за выход из аккаунта
function logout() {
    auth.signOut()
    localStorage.removeItem('todos')
}

// Находим элементы формы ввода
const form = document.querySelector('#form')
let date = new Date()
let time = date.getTime()
let counter = time
//создаём пустой массив, чтобы при каждом добавлении записи сначала создавался этот массив, а потом отображался
let todos = []
//найдём родительский блок для блоков записей
const todoContainer = document.querySelector('#todo-container')

//добавляем функцию вытаскивания значения из формы и счётчик с временем для идентификации записей
form.addEventListener('submit', e => {
    e.preventDefault()
    const text = form['todos'].value
    let id = counter += 1
    form.reset()

    //Проверяем, есть ли у нас такой пользователь и если есть, то называем его уникальным идентификатором   
    auth.onAuthStateChanged((user) => {
        if (user) {
            db.collection(user.uid)
                .doc("_" + id)
                .set({
                    id: "_" + id,
                    text,
                    completed: false,
                })
                .then(() => {
                    console.log('todo added');
                })
                .catch((err) => {
                    console.log(err.message);
                })
        }
    })

})

//функция для сохранения введённых данных
function saveData(doc) {
    let todo = {
        id: doc.id,
        text: doc.data().text, //data() - возвращает тело записи
        completed: doc.data().completed
    }
    todos.push(todo)
}

// принимает id добавляемой задачи и ищет её в нашем массиве и сохраняет в переменную todoObject
function renderData(id) {
    let todoObject = todos.find((todo) => todo.id === id)

    let parentDiv = document.createElement('li')
    parentDiv.setAttribute('id', todoObject.id)

    let todoDiv = document.createElement('p')
    todoDiv.textContent = todoObject.text.lenght < 21 ?
        todoObject.text :
        todoObject.text.slice(0, 20)

    todoObject.completed ?
        todoDiv.classList.add('completed') :
        todoDiv

    parentDiv.appendChild(todoDiv)
    todoContainer.appendChild(parentDiv)
    //кнопка для удаления записи
    let trashButton = document.createElement('button')
    trashButton.className = 'far fa-trash-alt'
    trashButton.classList.add('delete')
    trashButton.classList.add('button')
    trashButton.classList.add('hover_button')
    //слушатель на кнопку удаления, чтобы он по ид удалял запись в базе

    trashButton.addEventListener('click', (e) => {
        let id = e.target.parentElement.parentElement.getAttribute("id");
        auth.onAuthStateChanged((user) => {
            if (user) db.collection(user.uid).doc(id).delete();
            console.log(id)
        })
    })

    //кнопка завеошения задачи
    let completeButton = document.createElement('button')
    completeButton.className = 'fa solid fa-check'
    completeButton.classList.add('finish')
    completeButton.classList.add('button')
    completeButton.classList.add('hover_button')

    completeButton.addEventListener('click', (e) => {
        let id = e.target.parentElement.parentElement.getAttribute("id");
        auth.onAuthStateChanged((user) => {
            let item = db.collection(`${user.uid}`).doc(id)
            item.get().then((doc) => {
                item.update({
                    completed: !doc.data().completed
                }) // ! - возвращает обратное значение поля completed. Используется такой синтаксис, чтобы можно было задачу завершать и возобновлять по одной кнопке
                todoDiv.classList.toggle('completed')
                todos.map(todo => todo.id === doc.id //проходим по массиву и если внутри него у записей есть todo.id, сравниваем их с полученной записью из массива doc.id
                    ?
                    todo.completed = !todo.completed //поле 'выполнено'  меняем на противоположное
                    :
                    todo.completed = todo) //если поле не равно doc(id), оставляем значение 
            })
        })
    })

    //вставляем кнопки в родительский блок
    let buttonDiv = document.createElement('div')
    buttonDiv.className = 'button_div'
    buttonDiv.appendChild(trashButton)
    buttonDiv.appendChild(completeButton)
    parentDiv.appendChild(buttonDiv)
}

//слушаем изменения в базе данных, чтобы сделать запрос получения новых данных через команду onSnapshot
auth.onAuthStateChanged(user => {
    if (user) {
        db.collection(user.uid).onSnapshot((snapshot) => {
            let changes = snapshot.docChanges() //docChanges статус изменений 

            changes.forEach(change => { //через перебор для каждого элемента смотрим, есть ли изменения added (добавленные)
                if (change.type === "added") {
                    saveData(change.doc)
                    renderData(change.doc.id)
                } else if (change.type === "removed") {
                    let li = todoContainer.querySelector(`#${change.doc.id}`) //находим именно ту запись

                    todoContainer.removeChild(li) //удаляем ребёнка на экране, то есть li
                    todos = todos.filter((todo) => todo.id !== change.doc.id) //отфильтровать и удалить в массиве именно тот объект, который был на экране
                    console.log("delete")
                }
            })
            localStorage.setItem('todos', JSON.stringify(todos)) //добавляем в локальное хранилище
        })
    }
})

//фильтр задач по статусу выполнения, реализовано через обмен с локальной памятью
function filterHandler(statys) { //в кнопках вызова на форме прописано три возможных статуса
    if (statys === 'completed')
        todos = JSON.parse(localStorage.getItem('todos')).filter(todo => todo.completed)
    else if (statys === 'open')
        todos = JSON.parse(localStorage.getItem('todos')).filter(todo => !todo.completed)
    else todos = JSON.parse(localStorage.getItem('todos'))
    todoContainer.innerHTML = ''
    todos.forEach(todo => renderData(todo.id))
}