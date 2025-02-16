(function ($) {
    "use strict";
	$('.menu-item.has-submenu .menu-link').on('click', function(e){
		e.preventDefault();
		if($(this).next('.submenu').is(':hidden')){
			$(this).parent('.has-submenu').siblings().find('.submenu').slideUp(200);
		} 
		$(this).next('.submenu').slideToggle(200);
	});

	$("[data-trigger]").on("click", function(e){
		e.preventDefault();
		e.stopPropagation();
		var offcanvas_id =  $(this).attr('data-trigger');
		$(offcanvas_id).toggleClass("show");
		$('body').toggleClass("offcanvas-active");
		$(".screen-overlay").toggleClass("show");

	}); 

	$(".screen-overlay, .btn-close").click(function(e){
		$(".screen-overlay").removeClass("show");
		$(".mobile-offcanvas, .show").removeClass("show");
		$("body").removeClass("offcanvas-active");
	}); 


	$('.btn-aside-minimize').on('click', function(){
		if( window.innerWidth < 768) {
			$('body').removeClass('aside-mini');
			$(".screen-overlay").removeClass("show");
			$(".navbar-aside").removeClass("show");
			$("body").removeClass("offcanvas-active");
		} 
		else {
			$('body').toggleClass('aside-mini');
		}
	});

	if ($('.select-nice').length) {
    	$('.select-nice').select2();
	}
	if ($('#offcanvas_aside').length) {
		const demo = document.querySelector('#offcanvas_aside');
		const ps = new PerfectScrollbar(demo);
	}

	$('.darkmode').on('click', function () {
		$('body').toggleClass("dark");
	});
	
})(jQuery);
// (function ($) {
//     "use strict";
    
  
//     $('body').addClass("dark");

 
//     $('.darkmode').on('click', function (e) {
//         e.preventDefault();
//         $('body').addClass("dark");
//     });

   
//     $('.menu-item.has-submenu .menu-link').on('click', function(e){
//         e.preventDefault();
//         if($(this).next('.submenu').is(':hidden')){
//             $(this).parent('.has-submenu').siblings().find('.submenu').slideUp(200);
//         } 
//         $(this).next('.submenu').slideToggle(200);
//     });


//     $("[data-trigger]").on("click", function(e){
//         e.preventDefault();
//         e.stopPropagation();
//         var offcanvas_id =  $(this).attr('data-trigger');
//         $(offcanvas_id).toggleClass("show");
//         $('body').toggleClass("offcanvas-active");
//         $(".screen-overlay").toggleClass("show");
//     }); 

//     $(".screen-overlay, .btn-close").click(function(){
//         $(".screen-overlay").removeClass("show");
//         $(".mobile-offcanvas, .show").removeClass("show");
//         $("body").removeClass("offcanvas-active");
//     }); 

    
//     $('.btn-aside-minimize').on('click', function(){
//         if (window.innerWidth < 768) {
//             $('body').removeClass('aside-mini');
//             $(".screen-overlay").removeClass("show");
//             $(".navbar-aside").removeClass("show");
//             $("body").removeClass("offcanvas-active");
//         } else {
//             $('body').toggleClass('aside-mini');
//         }
//     });

 
//     if ($('.select-nice').length) {
//         $('.select-nice').select2();
//     }

  
//     if ($('#offcanvas_aside').length) {
//         const demo = document.querySelector('#offcanvas_aside');
//         const ps = new PerfectScrollbar(demo);
//     }

// })(jQuery);
