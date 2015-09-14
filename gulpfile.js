var gulp = require('gulp');
var concat = require('gulp-concat-util');
var babel = require('gulp-babel');

// Src include order
var src = [
    './src/imgur-enhance.js',
    './src/**'
];

// Compile
gulp.task('default', function() {
    return gulp.src(src)
        .pipe(concat('imgur-enhance.user.js'))
        .pipe(babel())
        .pipe(gulp.dest('dist'));
});