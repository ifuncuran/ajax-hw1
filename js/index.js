const input = document.getElementsByClassName('search__field')[0];
const requestURL =
  'https://api.themoviedb.org/3/search/movie?api_key=f680a867566257f0ead418be1d746aca&query=';
const urlToImg = 'https://image.tmdb.org/t/p/original/';

const maxSuggests = 10;
const maxLocalSuggest = 5;
const maxLastSearches = 3;

let LocalElems = updateLocalElems();

function updateLocalElems() {
  return localStorage.getItem('items')
    ? JSON.parse(localStorage.getItem('items'))
    : [];
}

function boldString(str, find) {
  return str.replaceAll(find, '<b>' + find + '</b>');
}

function checkIsInArr(arr, id) {
  return arr.some(function (arrVal) {
    return id === arrVal.idtmdb;
  });
}

function setLocalStorage() {
  try {
    localStorage.setItem('items', JSON.stringify(LocalElems));
  } catch (e) {
    console.error('Возникла ошибка:', e);
  }
}

function sendRequest(text) {
  return fetch(requestURL + '"' + text + '"').then((response) => {
    if (response.ok) {
      return response.json();
    }
    return response.json().then((error) => {
      const e = new Error('Возникла ошибка...');
      e.data = error;
      throw e;
    });
  });
}

function showResults(title, vote, imgSrc) {
  document.getElementsByClassName('result__title')[0].innerHTML = title;

  document.getElementsByClassName('result__vote')[0].innerHTML = vote;

  document.getElementsByClassName('result__image')[0].src = imgSrc;
}

//запрос на сервер по введенному значению и обновление элементов страницы + добавление элемента в localStorage:
function search() {
  sendRequest(input.value)
    .then((data) => {
      if (data['total_results'] != 0) {
        showResults(
          data['results'][0]['title'],
          data['results'][0]['vote_average'],
          urlToImg + data['results'][0]['poster_path']
        );

        LocalElems = updateLocalElems();

        LocalElems.push({
          name: data['results'][0]['title'],
          idtmdb: data['results'][0]['id'],
        });
        setLocalStorage();

        updateLastSearches();
      } else {
        showResults('Результатов по запросу не найдено', '', '');

        LocalElems = updateLocalElems();
        LocalElems.push({ name: input.value, idtmdb: null });
        setLocalStorage();
        updateLastSearches();
      }
    })
    .catch((err) => console.error(err));
}

// саджесты при изменении текста поиска
input.oninput = function () {
  let arrToOut = [];
  let count = 0;
  //тут ищем по всем элементам локалстораджа
  if (localStorage.getItem('items')) {
    JSON.parse(localStorage.getItem('items')).forEach((item) => {
      if (count < maxLocalSuggest) {
        let findIncludes = item.name
          .toLowerCase()
          .indexOf(input.value.toLowerCase());

        if (findIncludes != -1) {
          //если в архиве к выводу еще нет такого же элемента или фильм не был найден в api
          if (!checkIsInArr(arrToOut, item.idtmdb) && item.idtmdb != null) {
            arrToOut[count] = item;
            //выделим жирным область вывода, которая равна вводу:
            let substr = item.name.substring(
              findIncludes,
              findIncludes + input.value.length
            );
            arrToOut[count].name = boldString(arrToOut[count].name, substr);

            count++;
          }
        }
      }
    });
  }

  countLocal = count;

  //далее пытаемся заполнить до максимального кол-ва саджестов из результатов запроса к api:
  sendRequest(input.value)
    .then((data) => {
      // start - вспомогательная переменная, сначала равняется количеству параметров из localStorage
      let start = count;
      let end =
        data['total_results'] + count + 1 > maxSuggests
          ? maxSuggests
          : data['total_results'] + count;
      // продолжаем заполнять массив к выводу используя тот же инкремент count
      for (; count < end; count++) {
        // при пропуске одинаковых элементов уменьшается количество к выводу - поэтому проверяем элемент на undefined
        if (typeof data['results'][count - start] !== 'undefined') {
          let isOnList = false;
          let idToAdd = data['results'][count - start]['id'];
          arrToOut.forEach((item) => {
            if (item.idtmdb == idToAdd) {
              isOnList = true;
            }
          });
          if (!isOnList) {
            arrToOut[count] = {
              name: data['results'][count - start]['title'],
              idtmdb: idToAdd,
            };
          } else {
            count--;
            //далее переменная start при пропуске одинаковых элементов позволяет избежать зацикливания
            start--;
          }
        }
      }
      showArrToOut(arrToOut, countLocal);
    })
    .catch((err) => console.error(err));
};

//обновляем отображение саджестов:
function showArrToOut(data, countToCurve) {
  const searchList = document.getElementsByClassName(
    'search__suggestion-container'
  );
  for (let item of searchList) {
    item.innerHTML = '';
  }
  let i = 0;
  for (; i < countToCurve; i++) {
    searchList[i].style.color = 'blue';
    searchList[i].innerHTML = data[i].name;
  }
  for (; i < data.length; i++) {
    searchList[i].style.color = '';
    searchList[i].innerHTML = data[i].name;
  }
}

// при нажатии на саджест подставляем его в поисковую строку и сразу выводим результат
function applySuggest(elem) {
  input.value = elem.innerText;
  search();
}

function updateLastSearches() {
  const localData = JSON.parse(localStorage.getItem('items'));
  const lastSearches = document.getElementsByClassName('lastSearches__item');
  console.log(localData);
  let count =
    localData.length > maxLastSearches ? maxLastSearches : localData.length;
  for (let i = 0; i < count; i++) {
    lastSearches[i].innerHTML = localData[localData.length - i - 1].name;
  }
}

//апдейтим предыдущие запросы при изменениях в localStorage
window.addEventListener('storage', () => updateLastSearches());
