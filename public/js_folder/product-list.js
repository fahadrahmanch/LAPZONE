const click=document.querySelectorAll('.evented');
// const listedID=document.getElementById('listedID')
click.forEach(button=>{
button.addEventListener('click',async ()=>{
//    event.preventDefault()
    const productId=button.getAttribute('data-id');
    console.log(productId)
    const action=button.getAttribute('data-list')
    // const badge = document.querySelector(`span[data-id="${userId}"]`);
    try{
        const response= await fetch('/admin/listedProducts',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({productId,action})
        });  
        const result= await response.json();
        const {status}=result
        
        if(response.ok){
            if(status==='unlist'){
                console.log("changing to unlist")
                console.log(result.status);
                // console.log('hi')
                button.textContent='unlist';
                button.classList.remove('btn-success');
                button.classList.add('btn-danger');
                button.setAttribute('data-list','unlist')
                
            }else{  
                // console.log("listing")
                button.textContent='list';
                button.classList.remove('btn-danger')
                button.classList.add('btn-success');
                button.setAttribute('data-list','list')
                          // console.log('hii')


            }
            
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
