'use strict'

//задаем необходимые переменные
let list = document.body.querySelector('.mus-list-top-songs');

//real_queue - исходный плейлист, queue - используемый плейлист, shuffle_queue - перемешанный плейлист
let real_queue = [];
let queue = [];
let shuffle_queue = [];

//audio_index - индекс играющего трека в плейлисте, current_song - ссылка на играющий трек
//current_song_time - длительность играющего трека
let audio, audio_index, current_song, current_song_time, temp_volume;
let isShuffle = false;
let isPlaying = false;

//previous_btn - ссылка на кнопку Назад в плеере
let music_player = document.querySelector('.mus-player');
let previous_btn = music_player.querySelector('.mus-player-previous');

let new_volume = localStorage.getItem('volume');
document.querySelector('.mus-volume-bar').value = new_volume * 100;
if (!localStorage.getItem('volume')) localStorage.setItem('volume', 0.3);

//убираем возможность выделять мышкой
document.body.addEventListener('mousedown', (e) => e.which != 2 ? e.preventDefault() : null);

//перебираем список треков со всей необходимой информацией и загружаем все в HTML
for (let obj of JSON.parse(json)) {
  let song = document.createElement('div');
  song.className = 'mus-row-songs';
  song.id = obj['id'];
  list.append(song);

  let rating = document.createElement('div');
  rating.className = 'mus-row-songs-rating';
  rating.innerHTML = `<b>${obj['rating']}</b>`;
  song.append(rating);

  let pic = document.createElement('div');
  pic.className = 'mus-row-songs-img';
  pic.innerHTML = `<img src="${obj['url']}" class="img-fluid" width="45" height="45">`;
  song.append(pic);
  if (obj['id'] >= 10) {
    pic.style.margin = "0 15px 0 9px";
  } else {
    pic.style.margin = "0 15px";
  }

  let song_name = document.createElement('div');
  song_name.className = 'mus-row-songs-name';
  song_name.innerHTML = `<b>${obj['name']}</b><p>${obj['artist']}</p>`;
  song.append(song_name);

  let time = document.createElement('div');
  time.className = 'mus-row-songs-time';
  time.innerHTML = `<b>${obj['time']}</b>`;
  song.append(time);

  let audio = document.createElement('audio');
  audio.setAttribute('src', obj['audio']);
  song.append(audio);

  real_queue.push(obj['id']);
  queue = real_queue.slice();

  song.addEventListener('click', function(event) {
    if (this.classList == "mus-row-songs") {
      playMusic(this, true);
    }
  });
  song.addEventListener('mousedown', (e) => e.which != 2 ? e.preventDefault() : null);
}

//создаем 2 кнопки: Play и Stop, а также карточку с информацией о играющем треке
let btn_play = document.createElement('div');
btn_play.className = "mus-player-play mus-main-btn";
btn_play.innerHTML = `<img src="images/play.svg" class="img-fluid" width="35" height="35">`;

let btn_pause = document.createElement('div');
btn_pause.className = "mus-player-pause mus-main-btn";
btn_pause.innerHTML = `<img src="images/pause.svg" class="img-fluid" width="35" height="35">`;

let player_song_detail = document.createElement('div');
player_song_detail.className = "mus-player-song-detail";
player_song_detail.style.position = "absolute";
player_song_detail.style.left = window.innerWidth / 87.8 + "%";
document.querySelector('.mus-player-previous').before(player_song_detail);

//создаем иконку, которая появляется поверх играющего трека
function mus_image_btn(obj) {
  let img = obj.querySelector('img');
  let btn_centered = document.createElement('div');
  btn_centered.className = 'mus-song-centered';
  btn_centered.innerHTML = '<img src="images/playing.svg" class="img-fluid" width="26" height="26">';

  //получаем координаты центра, 13 - половина ширины и высоты иконки
  let center_x = obj.getBoundingClientRect().left + pageXOffset + (obj.offsetWidth / 2) - 14;
  let center_y = obj.getBoundingClientRect().top + pageYOffset + (obj.offsetHeight / 2) - 13;

  btn_centered.style.left = center_x + 'px';
  btn_centered.style.top = center_y + 'px';

  return btn_centered;
}

//функция для проигрывания треков
function playMusic(e, fromList) {

  //создаем новый перемешанный плейлист, если нажали на трек, не играющий в данный момент
  if (fromList && isShuffle && audio != e.querySelector('audio')) {
    queue = shuffle(queue).slice();
    localStorage.setItem('shuffle_queue', queue);
  }

  //заполняем подробную информацию об играющем треке в HTML
  player_song_detail.innerHTML = `<img src="${e.querySelector('img').src}" width="50" height="50"><div style="float: right;"><b>${e.querySelector('.mus-row-songs-name > b').textContent}</b>
    <p>${e.querySelector('.mus-row-songs-name > p').textContent}</p></div>`;
  document.querySelector('.mus-time-bar-end').innerHTML = e.querySelector('.mus-row-songs-time').textContent;
  document.title = e.querySelector('.mus-row-songs-name > p').textContent + " - " + e.querySelector('.mus-row-songs-name > b').textContent;
  current_song_time = e.querySelector('.mus-row-songs-time').textContent.split(':')[0] * 60 + parseInt(e.querySelector('.mus-row-songs-time').textContent.split(':')[1]);

  if (!isPlaying) {
    document.querySelector('.mus-player-play').remove();
    previous_btn.after(btn_pause);
    isPlaying = true;
  }

  //пока audio является прошлым треком, поэтому при проигрывании нового трека мы убираем со старого обработчики событий
  if (audio && audio != e.querySelector('audio')){
    audio.pause();
    audio.currentTime = 0;
    document.body.querySelector('.mus-player').removeEventListener('click', change_status);
    document.removeEventListener('keydown', change_status);
  }

  //делаем 100% прозрачности старому треку, удаляем иконку проигрывания, делаем 20% прозрачности и добавляем иконку проигрывания новому треку
  if (current_song){
    document.getElementById(current_song.id).querySelector('.mus-row-songs-img').style.opacity = "1";
    document.querySelector('.mus-song-centered').remove();
  }
  document.body.append(mus_image_btn(e.querySelector('.mus-row-songs-img')));
  e.querySelector('.mus-row-songs-img').style.opacity = "0.2";

  //задаем переменную audio (играющий трек)
  audio = e.querySelector('audio');
  audio.play();
  audio.volume = new_volume;
  audio_index = e.id; //индекс играющего трека в плейлисте

  //добавляем события
  document.body.querySelector('.mus-player').addEventListener('click', change_status);
  document.addEventListener('keydown', keydown_change_status);
  audio.addEventListener('ended', audio_end);
  current_song = e; //ссылка на играющий трек

  //заполняем хранилище, чтобы при новом заходе на сайт, проигрывал тот же трек с того же времени
  localStorage.setItem('song_img', e.querySelector('img').src);
  localStorage.setItem('song_name', e.querySelector('.mus-row-songs-name > b').textContent);
  localStorage.setItem('song_artist', e.querySelector('.mus-row-songs-name > p').textContent);
  localStorage.setItem('song_time', 0);
  localStorage.setItem('song_id', e.id);
}

//получаем данные из хранилища; если мы включали треки раньше, то запустится последний трек (вместе с информацией о времени и громкости)
if (localStorage.getItem('song_name')) {
  play_local_song();
}

function play_local_song() {

  //задаем карточку трека
  player_song_detail.innerHTML = `<img src="${localStorage.getItem('song_img')}" width="50" height="50"><div style="float: right;"><b>${localStorage.getItem('song_name')}</b>
    <p>${localStorage.getItem('song_artist')}</p></div>`;
  let local_song = document.getElementById(localStorage.getItem('song_id'));

  //если есть в хранилище перемешанный плейлист, загружаем его и делаем используемым
  if (localStorage.getItem("shuffle_queue")) {
    queue = localStorage.getItem("shuffle_queue").split(',');
    document.querySelector('.mus-player-shuffle > img').src = "images/shuffle_active.svg";
    isShuffle = true;
  }

  //задаем параметры треку
  audio = local_song.querySelector('audio');
  audio.currentTime = localStorage.getItem('song_time');
  audio.volume = localStorage.getItem('volume');
  current_song_time = local_song.querySelector('.mus-row-songs-time').textContent.split(':')[0] * 60 + parseInt(local_song.querySelector('.mus-row-songs-time').textContent.split(':')[1]);
  document.querySelector('.mus-time-bar-end').innerHTML = local_song.querySelector('.mus-row-songs-time').textContent;
  audio_index = local_song.id;
  audio.addEventListener('ended', audio_end);
  current_song = local_song;

  //задаем данные ползунку
  document.querySelector('.mus-time-bar').value = (audio.currentTime / current_song_time) * 100;
  let current_minutes = Math.floor(audio.currentTime / 60);
  let current_seconds = Math.round(audio.currentTime % 60);
  if (current_seconds == 60) {
    current_seconds = 0;
    current_minutes = current_minutes + 1;
  }
  if (current_seconds < 10)
    document.querySelector('.mus-time-bar-start').innerHTML = current_minutes + ":0" + current_seconds;
  else
    document.querySelector('.mus-time-bar-start').innerHTML = current_minutes + ":" + current_seconds;

  //задаем обработчики событий
  document.body.querySelector('.mus-player').addEventListener('click', change_status);
  document.addEventListener('keydown', keydown_change_status);
  document.title = localStorage.getItem('song_artist') + " - " + localStorage.getItem('song_name');
  window.addEventListener("load", () => document.body.append(mus_image_btn(local_song.querySelector('.mus-row-songs-img')))); //ждем, пока загрузится весь контент, только потом вставляем иконку
  local_song.querySelector('.mus-row-songs-img').style.opacity = "0.2";
}

//обрабатываем события нажатий на кнопки плеера
function change_status(event) {

  let target = event.target;

  //кнопки Pause и Play
  if (target.parentElement.classList.contains("mus-main-btn")) {
    if (isPlaying == true) {
      document.querySelector('.mus-player-pause').remove();
      previous_btn.after(btn_play);
      audio.pause();
    } else {
      document.querySelector('.mus-player-play').remove();
      previous_btn.after(btn_pause);
      audio.play();
    }
    isPlaying = !isPlaying;
  }

  switch (target.parentElement.className) {
    //кнопка мута
    case "mus-player-volume":
      if (new_volume != 0) {
        temp_volume = new_volume; //сохраняем громкость, чтобы после анмута была та же громкость
        document.querySelector('.mus-volume-bar').value = 0;
        if (audio) audio.volume = 0;
        new_volume = 0;
        target.src = "images/mute.svg";
      } else {
        new_volume = temp_volume;
        if (new_volume < 0.05) new_volume = 0.05;
        document.querySelector('.mus-volume-bar').value = new_volume * 100;
        if (audio) audio.volume = new_volume;
        target.src = "images/volume.svg";
      }
      break;

  //клавиши Назад и Вперед
  case "mus-player-previous":
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
    } else {
      let current_index = queue.indexOf(audio_index) - 1;
      if (current_index == -1) current_index = queue.length - 1;
      audio_index = current_index;
      playMusic(document.getElementById(queue[current_index]), false);
    }
    break;

  case "mus-player-next":
    let current_index = queue.indexOf(audio_index) + 1;
    if (current_index + 1 > queue.length) current_index = 0;
    audio_index = current_index;
    playMusic(document.getElementById(queue[current_index]), false);
    break;

  //кнопка перемешки
  case "mus-player-shuffle":
    if (isShuffle) {
      target.src = "images/shuffle.svg";
      isShuffle = false;
      queue = real_queue.slice();
      localStorage.removeItem("shuffle_queue");
    } else {
      target.src = "images/shuffle_active.svg";
      isShuffle = true;
      queue = shuffle(queue).slice();
      localStorage.setItem('shuffle_queue', queue);
    }
    break;
  }
}

//обрабатываем события нажатия на клавиши (медиа-клавиши не функционируют за пределами страницы)
function keydown_change_status(event) {
  if (event.code == "Space") {
    event.preventDefault();
    document.addEventListener('keyup', space_change_status);
  }
  switch(event.key) {
    case "MediaPlayPause":
      if (isPlaying == true) {
        document.querySelector('.mus-player-pause').remove();
        previous_btn.after(btn_play);
      } else {
        document.querySelector('.mus-player-play').remove();
        previous_btn.after(btn_pause);
      }
      isPlaying = !isPlaying;
      break;

  case "MediaTrackPrevious":
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
    } else {
      let current_index = queue.indexOf(audio_index) - 1;
      if (current_index == -1) current_index = queue.length - 1;
      audio_index = current_index;
      playMusic(document.getElementById(queue[current_index]), false);
    }
    break;

  case "MediaTrackNext":
    let current_index = queue.indexOf(audio_index) + 1;
    if (current_index + 1 > queue.length) current_index = 0;
    audio_index = current_index;
    playMusic(document.getElementById(queue[current_index]), false);
    break;
  }
}

//функция, которая не позволяет при зажатом Пробеле постоянно включать-выключать трек
function space_change_status (event) {
  if (event.code == "Space") {
    if (isPlaying == true) {
      document.querySelector('.mus-player-pause').remove();
      previous_btn.after(btn_play);
      audio.pause();
    } else {
      document.querySelector('.mus-player-play').remove();
      previous_btn.after(btn_pause);
      audio.play();
    }
    isPlaying = !isPlaying;
    document.removeEventListener('keyup', space_change_status);
  }
}

//делаем функционал кнопке "Shuffle tracks"
document.body.querySelector('.mus-row-shuffle').addEventListener('click', shuffle_start);
document.body.querySelector('.mus-row-shuffle').addEventListener('mousedown', (e) => e.which != 2 ? e.preventDefault() : null);

function shuffle_start(event) {
  queue = shuffle(queue).slice();
  localStorage.setItem('shuffle_queue', queue);
  isShuffle = true;
  document.querySelector('.mus-player-shuffle > img').src = "images/shuffle_active.svg";
  playMusic(document.getElementById(queue[0]), false);
}

//код для перемешивания плейлиста
function putToCache(elem, cache){
	if(cache.indexOf(elem) != -1){
		return;
	}
	let i = Math.floor(Math.random()*(cache.length + 1));
	cache.splice(i, 0, elem);
}

function madness(){
	let cache = [];
	return function(a, b){
		putToCache(a, cache);
		putToCache(b, cache);
		return cache.indexOf(b) - cache.indexOf(a);
	}
}

function shuffle(arr){
	let compare = madness();
	return arr.sort(compare);
}

//функционал для ползунков времени и громкости трека
document.querySelector('.mus-player').addEventListener('mousedown', bar_change);
document.querySelector('.mus-player').addEventListener('click', bar_change_over);
document.querySelector('.mus-player').addEventListener('mouseup', mouseup_after);

function mouseup_after(event) {
  //чтобы после передвижения ползунка не запускался клик, а то он второй раз меняет время (1)
  Promise.resolve()
  .then(() => document.body.removeEventListener('mousemove', bar_change_over))
  .then(() => setTimeout(() => document.querySelector('.mus-player').addEventListener('click', bar_change_over), 1));
}

function bar_change(event) {
  if (event.target.className == "mus-volume-bar" || event.target.className == "mus-time-bar") document.body.addEventListener('mousemove', bar_change_over);
}

function bar_change_over(event) {
  if (event.target.className == "mus-volume-bar"){
    let raz = event.layerX - document.querySelector('.mus-volume-bar').getBoundingClientRect().left;
    new_volume = (raz / document.querySelector('.mus-volume-bar').offsetWidth);
    if (audio) audio.volume = new_volume;
    document.querySelector('.mus-volume-bar').value = new_volume * 100;
    if (document.querySelector('.mus-volume-bar').value < 1) {
        if (audio) audio.volume = 0;
        new_volume = 0;
        document.querySelector('.mus-player-volume > img').src = "images/mute.svg";
    }
    if (new_volume != 0) document.querySelector('.mus-player-volume > img').src = "images/volume.svg";
    localStorage.setItem('volume', new_volume);
  }
  else if (event.target.className == "mus-time-bar") {
    if (audio) {
      let raz = event.layerX - document.querySelector('.mus-time-bar').getBoundingClientRect().left;
      audio.currentTime = (raz / document.querySelector('.mus-time-bar').offsetWidth) * current_song_time;
      document.querySelector('.mus-time-bar').value = (audio.currentTime / current_song_time) * 100;
      if (event.type == "mousemove") document.querySelector('.mus-player').removeEventListener('click', bar_change_over); //чтобы после передвижения ползунка не запускался клик,
      //а то он второй раз меняет время (2)
    }
  }
}

//код для постоянного обновления ползунка времени трека
setInterval(check_values, 0);

function check_values() {
  if (audio) {
    document.querySelector('.mus-time-bar').value = (audio.currentTime / current_song_time) * 100;
    localStorage.setItem('song_time', audio.currentTime);
    let current_minutes = Math.floor(audio.currentTime / 60);
    let current_seconds = Math.round(audio.currentTime % 60);
    if (current_seconds == 60) {
      current_seconds = 0;
      current_minutes = current_minutes + 1;
    }
    if (current_seconds < 10)
      document.querySelector('.mus-time-bar-start').innerHTML = current_minutes + ":0" + current_seconds;
    else
      document.querySelector('.mus-time-bar-start').innerHTML = current_minutes + ":" + current_seconds;
  }
  document.querySelector('.mus-player-song-detail').style.left = window.innerWidth / 87.8 + "%"; //изменение положения div'а в зависимости от ширины экрана
}

//запускается после окончания трека, запускает следующий трек в плейлисте
function audio_end(event) {
  let elem = event.target.parentElement;
  let current_index = queue.indexOf(audio_index) + 1;
  if (current_index + 1 > queue.length) current_index = 0;
  audio_index = current_index;
  playMusic(document.getElementById(queue[current_index]), false);
}
