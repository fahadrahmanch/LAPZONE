const click=document.querySelectorAll('.evented');
const listedID=document.getElementById('listedID')
click.forEach(button=>{
button.addEventListener('click',async ()=>{
//    event.preventDefault()
    const userId=button.getAttribute('data-id');
    const action=button.getAttribute('data-list')
    const badge = document.querySelector(`span[data-id="${userId}"]`);
    try{
        const response= await fetch('/admin/listed',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({userId,action})
        });  
        const result= await response.json();
        const {status}=result
        
        if(response.ok){
            // if(status==='unlist'){
            //     console.log("changing to unlist")
            //     console.log(result.status);
            //     // console.log('hi')
            //     badge.textContent='Unlisted'
            //     badge.classList.remove('alert-success');
            //     badge.classList.add('alert-danger')
            //     button.textContent='unlist';
            //     button.classList.remove('btn-success');
            //     button.classList.add('btn-danger');
            //     button.setAttribute('data-list','unlist')
                
            // }else{  
            //     // console.log("listing")
            //     button.textContent='list';
            //     button.classList.remove('btn-danger')
            //     button.classList.add('btn-success');
            //     button.setAttribute('data-list','list')
            //     badge.textContent='Listed'
            //     badge.classList.remove('alert-danger');
            //     badge.classList.add('alert-success')
              
            //     // console.log('hii')


            // }
            window.location.reload()
        }else{
               console.log(result.message)
               console.log("error")
        }
    }
    catch(error){
        console.log(error);
        alert('something went wrong')
    }
})
})



