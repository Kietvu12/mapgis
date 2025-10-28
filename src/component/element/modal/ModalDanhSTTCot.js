import React, { useEffect } from 'react'
import $ from 'jquery'
import { useSelector } from 'react-redux'
import useStateRef from 'react-usestateref'
import {
  getTenCotNoSTT,
  updateSTTCot,
  updateSTTCotByStartNumber
} from '../../map/RootFunction'
import { useDispatch } from 'react-redux'
import { changeRootFolder } from '../../reducer_action/BaseMapActionReducer'
export const enableModalDanhSTTCot = () => {
  $('.modal-nhap-stt-cot')
    .removeClass('d-none')
    .addClass('d-block')
}
export const disabledModalDanhSTTCot = () => {
  $('.modal-nhap-stt-cot')
    .removeClass('d-block')
    .addClass('d-none')
}
export default function ModalDanhSTTCot () {
  const list_root_folder = useSelector(state => state.baseMap.list_root_folder)
  const dispatch = useDispatch()

  const state_sua_nhieu_cot = useSelector(
    state => state.baseMap.state_sua_nhieu_cot
  )
  const [
    state_sua_nhieu_cot_ref,
    set_state_sua_nhieu_cot_ref,
    get_state_sua_nhieu_cot_ref
  ] = useStateRef(state_sua_nhieu_cot)
  const handleSubmit = async e => {
    e.preventDefault()
    let start = parseInt($('#startSTT_ModalDanhSTT').val())
    let list_root_folder_local = list_root_folder
    let uuid_folder_local = get_state_sua_nhieu_cot_ref.current[0].uuid_folder
    let name_cot_no_stt = getTenCotNoSTT(
      get_state_sua_nhieu_cot_ref.current[0].name
    )
    for (let i in get_state_sua_nhieu_cot_ref.current) {
      list_root_folder_local = await updateSTTCotByStartNumber(
        [...list_root_folder_local],
        get_state_sua_nhieu_cot_ref.current[i].uuid_folder,
        start,
        $('#kyHieuCot_ModalDanhSTT').val().toUpperCase(),
        get_state_sua_nhieu_cot_ref.current[i].uuid_cot
      )
      start += 1
    }
    list_root_folder_local = updateSTTCot(
      [...list_root_folder_local],
      uuid_folder_local,
      name_cot_no_stt
    )
    dispatch(changeRootFolder([...list_root_folder_local]))
    disabledModalDanhSTTCot()
    $('#kyHieuCot_ModalDanhSTT').val('')
    $('#startSTT_ModalDanhSTT').val(1)
  }
  useEffect(() => {
    set_state_sua_nhieu_cot_ref([...state_sua_nhieu_cot])
  }, [state_sua_nhieu_cot])
  return (
    <div
      className='modal d-none form-rj modal-nhap-stt-cot'
      id='exampleModal'
      tabIndex={-1}
      role='dialog'
      aria-labelledby='exampleModalLabel'
      aria-hidden='true'
    >
      <div className='modal-dialog' role='document'>
        <div className='modal-content'>
          {/* Header */}
          <div className='modal-header'>
            <p className='modal-title fs-3 text-dark' id='exampleModalLabel'>
              Tự động đánh số thứ tự
            </p>
            <button
              type='button'
              className='btn btn-icon btn-sm btn-ghost-secondary'
              data-dismiss='modal'
              aria-label='Close'
              onClick={() => disabledModalDanhSTTCot()}
            >
              <i className='tio-clear tio-lg' aria-hidden='true' />
            </button>
          </div>
          {/* End Header */}
          {/* Body */}
          <div className='modal-body'>
            {/*  Form */}
            <form
              className='js-validate'
              onSubmit={event => {
                handleSubmit(event)
              }}
            >
              {/* Input */}
              <div className='form-group row'>
                <label
                  htmlFor='nameLabel'
                  className='col-sm-3 fs-5 col-form-label input-label text-right'
                >
                  Ký hiệu cột:
                </label>
                <div className='col-sm-9 js-form-message'>
                  <input
                    type='text'
                    title='Ký hiệu không được để trống, tên ký tự không được chứa số.'
                    min={1}
                    id='kyHieuCot_ModalDanhSTT'
                    className='form-control'
                    placeholder='Nhập ký tự cột, không bao gồm số [0-9].'
                    // pattern='[A-Za-z]+'
                    required
                  />
                </div>
              </div>
              <div className='form-group row'>
                <label
                  htmlFor='nameLabel'
                  className='col-sm-3 fs-5 col-form-label input-label text-right'
                >
                  Bắt đầu từ:
                </label>
                <div className='col-sm-9 js-form-message'>
                  <input
                    type='number'
                    title='Phải bắt đầu từ 1.'
                    min={1}
                    id='startSTT_ModalDanhSTT'
                    className='form-control'
                    placeholder='Nhập số thứ tự muốn bắt đầu.'
                    required
                    pattern='[0-9]+'
                  />
                </div>
              </div>
              <button type='submit' className='btn btn-primary'>
                Chèn
              </button>
            </form>
            {/* End Form */}
          </div>
          {/* End Body */}
        </div>
      </div>
    </div>
  )
}
