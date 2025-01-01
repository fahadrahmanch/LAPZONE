document.querySelector('.user').addEventListener('mouseenter', function () {
    this.querySelector('ul').style.display = 'block';
});

document.querySelector('.user').addEventListener('mouseleave', function () {
    this.querySelector('ul').style.display = 'none';
});
