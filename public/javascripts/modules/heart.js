// we need axios
import axios from 'axios';
// we need bling to update the heart count
import { $ } from './bling';

// this is where we will handel the form submit
function ajaxHeart(e) {
	// stop the form from submitting
	e.preventDefault();
	console.log('heart it!');

	// we will post to using the form action why? because it already has the id attached to it
	axios
		.post(this.action)
		.then((res) => {
			const isHearted = this.heart.classList.toggle('heart__button--hearted');
			$('.heart-count').textContent = res.data.hearts.length;

			if (isHearted) {
				this.heart.classList.add('heart__button--float');
				setTimeout(() => {
					this.heart.classList.remove('heart__button--float');
				}, 2500);
			}
		})
		.catch(console.error);
}

// expose the method to other files
export default ajaxHeart;
