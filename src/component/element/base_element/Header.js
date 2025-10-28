import $, { valHooks } from 'jquery'
import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { create_UUID } from '../../base/base'

import { Images } from '../../const/Const_Images'
import { getToaDoDuong, MAP, VIEW } from '../../map/RootFunction'
import { changeRootNen } from '../../reducer_action/BaseMapActionReducer'
import { enableModalThemFolder } from '../modal/ModalThemFolder'
import { getCoorCot, getCoorDoDuong, getObjectFromKML } from './Aside'

// Helper: sanitize KML string by injecting missing namespaces (e.g., mwm)
const sanitizeKml = (xmlString) => {
  if (typeof xmlString !== 'string') return xmlString
  try {
    if (xmlString.includes('<kml') && !xmlString.includes('xmlns:mwm')) {
      xmlString = xmlString.replace('<kml', '<kml xmlns:mwm="http://maps.me"')
    }
  } catch (e) {}
  return xmlString
}
// Helper function to parse simple Point data from KML
const parseSimplePoint = (xml, fullDocumentXml = null) => {
  let text = xml.find('Point > coordinates').text().trim()
  
  if (
    text.split(',')[0] != '' &&
    text.split(',')[0] != null &&
    text.split(',')[1] != '' &&
    text.split(',')[1] != null
  ) {
    // Try to read icon from KML styleUrl or IconStyle
    let iconUrl = Images.IMG_PUSHPIN // default
    
    // Check if there's a styleUrl reference
    const styleUrl = xml.find('styleUrl').text().trim()
    if (styleUrl && fullDocumentXml) {
      const styleId = styleUrl.replace('#', '')
      
      // Try to find the icon in the Style definition
      const styleElement = fullDocumentXml.find(`Style#${styleId} IconStyle > Icon > href`)
      if (styleElement.length > 0) {
        iconUrl = styleElement.text().trim()
      } else {
        // Try StyleMap
        const styleMapElement = fullDocumentXml.find(`StyleMap#${styleId}`)
        if (styleMapElement.length > 0) {
          const normalStyleId = styleMapElement.find('Pair > key:contains("normal")').next('styleUrl').text().trim().replace('#', '')
          if (normalStyleId) {
            const normalIconElement = fullDocumentXml.find(`Style#${normalStyleId} IconStyle > Icon > href`)
            if (normalIconElement.length > 0) {
              iconUrl = normalIconElement.text().trim()
            }
          }
        }
      }
    }
    
    // Try to get icon directly from IconStyle in this Placemark
    const directIcon = xml.find('IconStyle > Icon > href')
    if (directIcon.length > 0 && directIcon.text().trim()) {
      iconUrl = directIcon.text().trim()
    }
    
    return {
      uuid_cot: create_UUID(),
      name: xml.find('name').text().trim(),
      coor: [parseFloat(text.split(',')[0]), parseFloat(text.split(',')[1])],
      active_cot: true,
      type: 'cot',
      uuid_folder: null,
      src_icon: iconUrl
    }
  }
  return null
}

export const getObjectFromKML_NEN = (path_folder, xml, list_group_duong_cot) => {
  /**
   * GET ra các đối tượng đường và cột từ dữ liệu kml đọc được
   * Hỗ trợ nested folders và đọc tất cả Placemark
   *
   * @param path_folder: Đường dẫn của thư mục hiện tại
   * @param xml: Data đọc được từ file kml (jQuery element)
   * @param list_group_duong_cot: mảng đường và cột, mặc định []
   * @author XHieu
   */
  
  // Xử lý tất cả Placemark trực tiếp trong folder hiện tại
  $(xml).find('> Placemark').each(function () {
    let placemarkName = $(this).find('name').text().trim()
    let hasLineString = $(this).find('LineString').length > 0
    let hasPoint = $(this).find('Point').length > 0
    
    if (hasLineString) {
      // Xử lý đường (LineString)
      let group_duong = {
        uuid_duong: create_UUID(),
        list_do_duong: [],
        active_do_duong: true,
        type: 'duong',
        name: placemarkName
      }
      getCoorDoDuong($(this), group_duong.list_do_duong)
      group_duong.list_do_duong = getToaDoDuong(group_duong.list_do_duong)
      list_group_duong_cot.push(group_duong)
      } else if (hasPoint) {
        // Xử lý điểm (Point) - dùng hàm parse đơn giản
        let fullDocXml = $(xml).closest('Document, kml')
        let cot = parseSimplePoint($(this), fullDocXml)
        if (cot != null) {
          list_group_duong_cot.push(cot)
          console.log('Added point:', cot)
        }
      }
    })

  // Xử lý tất cả nested folders (đệ quy)
  $(xml).find('> Folder').each(function () {
    let nested_folder = {
      folder_name: $(this).find('> name').text(),
      active_folder: true,
      uuid_folder: create_UUID(),
      list_group_duong_va_cot: [],
      list_cot_2: [],
      type: 'folder' // Add type property to distinguish folders from points/lines
    }

    list_group_duong_cot.push(nested_folder)

    // Đệ quy xử lý folder con
    getObjectFromKML_NEN('', $(this), nested_folder.list_group_duong_va_cot)
  })
}
export const getObjectFromKML_NEN2 = (path_folder, xml, list_group_duong_cot) => {
  let folder = ''
  let placemark = '> Placemark'
  path_folder += folder

  if ($(xml).find(path_folder + folder).length > 0) {
    $(xml)
      .find(path_folder + folder)
      .each(function () {
        let root_folder = {
          folder_name: $(this)
            .find('> name')
            .text(),
          active_folder: true,
          uuid_folder: create_UUID(),
          list_group_duong_va_cot: [],
          list_cot_2: []
        }

        list_group_duong_cot.push(root_folder)

        return getObjectFromKML(
          path_folder,
          $(this),
          list_group_duong_cot[list_group_duong_cot.length - 1]
            .list_group_duong_va_cot
        )
      })
  }

  // Xử lý Placemark trực tiếp trong Document
  $(xml)
    .find(path_folder + placemark)
    .each(function () {
      let placemarkName = $(this).find('name').text().trim()
      let hasLineString = $(this).find('LineString').length > 0
      let hasPoint = $(this).find('Point').length > 0
      
      console.log('Processing placemark:', placemarkName, 'LineString:', hasLineString, 'Point:', hasPoint)
      
      if (hasLineString) {
        // Xử lý đường (LineString)
        let group_duong = {
          uuid_duong: create_UUID(),
          list_do_duong: [], // danh sách tọa độ của đường
          active_do_duong: true,
          type: 'duong',
          name: placemarkName
        }
        getCoorDoDuong($(this), group_duong.list_do_duong)
        group_duong.list_do_duong = getToaDoDuong(group_duong.list_do_duong)
        list_group_duong_cot.push(group_duong)
        console.log('Added line:', group_duong)
      } else if (hasPoint) {
        // Xử lý điểm (Point)
        let fullDocXml = $(xml).closest('Document, kml')
        let cot = parseSimplePoint($(this), fullDocXml)
        if (cot != null) {
          list_group_duong_cot.push(cot)
          console.log('Added point:', cot)
        }
      }
    })

  // Xử lý Placemark trong Folder (vì file KML có cấu trúc Document > Folder > Placemark)
  $(xml)
    .find(path_folder + ' > Folder > Placemark')
    .each(function () {
      let placemarkName = $(this).find('name').text().trim()
      let hasLineString = $(this).find('LineString').length > 0
      let hasPoint = $(this).find('Point').length > 0
      
      console.log('Processing placemark in folder:', placemarkName, 'LineString:', hasLineString, 'Point:', hasPoint)
      
      if (hasLineString) {
        // Xử lý đường (LineString)
        let group_duong = {
          uuid_duong: create_UUID(),
          list_do_duong: [], // danh sách tọa độ của đường
          active_do_duong: true,
          type: 'duong',
          name: placemarkName
        }
        getCoorDoDuong($(this), group_duong.list_do_duong)
        group_duong.list_do_duong = getToaDoDuong(group_duong.list_do_duong)
        list_group_duong_cot.push(group_duong)
        console.log('Added line from folder:', group_duong)
      } else if (hasPoint) {
        // Xử lý điểm (Point)
        let fullDocXml = $(xml).closest('Document, kml')
        let cot = parseSimplePoint($(this), fullDocXml)
        if (cot != null) {
          list_group_duong_cot.push(cot)
          console.log('Added point from folder:', cot)
        }
      }
    })
}
export default function Header () {
  const dispatch = useDispatch()

  const handleImportFileNen = () => {
    let input = document.getElementById('filenen')
    input.click()
  }
  const handleImportFileNen2 = () => {
    let input = document.getElementById('filenen2')
    input.click()
  }
  const exportOSM = () => {
    window.open(`https://www.openstreetmap.org/#map=${VIEW.zoom}/${VIEW.center.latitude}/${VIEW.center.longitude}`) 
  }
  useEffect(() => {
    $('#filenen').on('change', function (e) {
      var fileReader = new FileReader()
      fileReader.onload = function () {
        var data = fileReader.result
        data = sanitizeKml(data)
        let xmlDoc = $.parseXML(data)
        let xml = $(xmlDoc)
        let list_root_nen = []
        $(xml)
          .find('Document > Folder')
          .each(function () {
            let root_folder = {
              folder_name: $(this)
                .find(' > name')
                .text(),
              uuid_folder: create_UUID(),
              active_folder: true,
              list_group_duong_va_cot: [],
              list_cot_2: [],
              type: 'folder' // Add type property for root folders
            }
            getObjectFromKML_NEN(
              'Document',
              $(this),
              root_folder.list_group_duong_va_cot
            )
            list_root_nen.push(root_folder)
          })
          console.log(list_root_nen);
        dispatch(changeRootNen(list_root_nen))
      }
      fileReader.readAsText($(this)[0].files[0])
      $(this).val('')
    })
    $('#filenen2').on('change', function (e) {
      var fileReader = new FileReader()
      fileReader.onload = function () {
        var data = fileReader.result
        data = sanitizeKml(data)
        let xmlDoc = $.parseXML(data)
        let xml = $(xmlDoc)
        let list_root_nen = []
        
        console.log('=== DEBUG KML PARSING 2 ===')
        let foldersFound = $(xml).find('Document > Folder').length
        let placemarksFound = $(xml).find('Document > Placemark').length
        
        console.log('Folders in Document:', foldersFound)
        console.log('Placemarks directly in Document:', placemarksFound)

        // Kiểm tra nếu có Folder con trong Document
        if (foldersFound > 0) {
          // Xử lý như cũ - có Folder con
          $(xml)
            .find('Document > Folder')
            .each(function () {
              let root_folder = {
                folder_name: $(this)
                  .find(' > name')
                  .text(),
                uuid_folder: create_UUID(),
                active_folder: true,
                list_group_duong_va_cot: [],
                list_cot_2: [],
                type: 'folder' // Add type property for root folders too
              }
              
              console.log('Processing Folder:', root_folder.folder_name)
              getObjectFromKML_NEN(
                'Document',
                $(this),
                root_folder.list_group_duong_va_cot
              )
              console.log('Items added to folder:', root_folder.list_group_duong_va_cot.length)
              console.log('Folder structure:', root_folder)
              
              // Debug: Log all items in folder
              root_folder.list_group_duong_va_cot.forEach((item, index) => {
                console.log(`Item ${index}:`, {
                  type: item.type,
                  name: item.name,
                  has_coor: !!item.coor,
                  has_list_do_duong: !!item.list_do_duong,
                  list_group_duong_va_cot: item.list_group_duong_va_cot ? item.list_group_duong_va_cot.length : 0
                })
              })
              
              list_root_nen.push(root_folder)
            })
        } else if (placemarksFound > 0) {
          // Không có Folder, tạo folder ảo và xử lý Placemark trực tiếp trong Document
          let documentName = $(xml).find('Document > name').text().trim() || 'Imported KML'
          let root_folder = {
            folder_name: documentName,
            uuid_folder: create_UUID(),
            active_folder: true,
            list_group_duong_va_cot: [],
            list_cot_2: [],
            type: 'folder' // Add type property for virtual folders
          }
          
          console.log('No folders found, processing Placemarks directly in Document')
          console.log('Document name:', documentName)
          
          // Xử lý tất cả Placemark trực tiếp trong Document
          $(xml).find('Document > Placemark').each(function () {
            let placemarkName = $(this).find('name').text().trim()
            let hasLineString = $(this).find('LineString').length > 0
            let hasPoint = $(this).find('Point').length > 0
            
            if (hasLineString) {
              // Xử lý đường (LineString)
              let group_duong = {
                uuid_duong: create_UUID(),
                list_do_duong: [],
                active_do_duong: true,
                type: 'duong',
                name: placemarkName
              }
              getCoorDoDuong($(this), group_duong.list_do_duong)
              group_duong.list_do_duong = getToaDoDuong(group_duong.list_do_duong)
              root_folder.list_group_duong_va_cot.push(group_duong)
              console.log('Added LineString:', placemarkName)
            } else if (hasPoint) {
              // Xử lý điểm (Point)
              let fullDocXml = $(xml).closest('Document, kml')
              let cot = parseSimplePoint($(this), fullDocXml)
              if (cot != null) {
                root_folder.list_group_duong_va_cot.push(cot)
                console.log('Added Point:', cot)
              }
            }
          })
          
          console.log('Total items in root folder:', root_folder.list_group_duong_va_cot.length)
          list_root_nen.push(root_folder)
        }
          
        console.log('Final result:', list_root_nen)
        console.log('Dispatching changeRootNen with', list_root_nen.length, 'folders')
        console.log('=== END DEBUG ===')
        dispatch(changeRootNen(list_root_nen))
      }
      fileReader.readAsText($(this)[0].files[0])
      $(this).val('')
    })
 
    $('.js-navbar-vertical-aside-toggle-invoker ').click(function () {
      $('.tio-first-page ').toggleClass('d-none')
      $('.tio-last-page').toggleClass('d-none')
      $('.js-navbar-vertical-aside').toggleClass('margin-left-ne-100')
      $('#content').toggleClass('p-0')
      $('#header').toggleClass('m-0')
      $('.App').toggleClass('ml-25')
    })
    $('#showImage').click(function () {
      $('.esri-print').toggleClass('d-block')
    })
    $('.menu-head > .hs-unfold').click(function () {
      $('.menu-head > .hs-unfold > a').removeClass('active-gray')
      $(this)
        .children()
        .addClass('active-gray')
    })
    $('.btn-show-aside-menu').click(function () {
      console.log('click')
      $('.aside-menu').toggleClass('show-aside')
    })
  }, [])
  return (
    <header
      id='header'
      style={{ maxWidth: '100vw', overflowX: 'auto' }}
      className='navbar  navbar-expand-lg navbar-sticky navbar-height navbar-flush navbar-container navbar-bordered'
    >
      <div className=' d-flex'>
        <div className='navbar-brand-wrapper'>
          {/* Logo */}
          <a className='navbar-brand' aria-label='Front'>
          </a>
          {/* End Logo */}
        </div>
        <div className='navbar-nav-wrap-content-left menu-head'>
          {/* Navbar Vertical Toggle */}
          <button
            type='button'
            title='Thu gọn menu'
            className='js-navbar-vertical-aside-toggle-invoker close mr-2 btn btn-icon btn-show-aside-menu btn-icon-head  btn-ghost-secondary rounded-circle'
          >
            {/* <i className='tio-first-page fs-1' />
            <i className='tio-last-page d-none fs-1' /> */}
            <img
              class='avatar tio-first-page avatar-xs avatar-4by3'
              style={{ width: '25px', height: '25px' }}
              src={Images.IMG_MENU}
              alt='Image Description'
            />
            <img
              class='avatar tio-first-page d-none avatar-xs avatar-4by3'
              style={{ width: '25px', height: '25px' }}
              src={Images.IMG_MENU}
              alt='Image Description'
            />
          </button>

          <div
            className='hs-unfold mr-2 '
            title='Tạo mới folder'
            id='createFolder'
            onClick={() => enableModalThemFolder()}
          >
            <a
              className='js-hs-unfold-invoker btn btn-icon btn-icon-head btn-ghost-secondary rounded-circle'
              href='javascript:;'
            >
              <img
                class='avatar avatar-xs avatar-4by3'
                style={{ width: '25px', height: '25px' }}
                src={Images.IMG_ADD_FOLDER}
                alt='Image Description'
              />
            </a>
          </div>

          <div
            className='hs-unfold mr-2 '
            title='Import KML File'
            id='importFileKml'
          >
            <a
              className='js-hs-unfold-invoker btn btn-icon btn-icon-head btn-ghost-secondary rounded-circle'
              href='javascript:;'
            >
              <img
                class='avatar avatar-xs avatar-4by3'
                style={{ width: '25px', height: '25px' }}
                src={Images.IMG_LOGO_KML}
                alt='Image Description'
              />
            </a>
          </div>
          <div
            className='hs-unfold mr-2 '
            title='Import file nền bản đồ'
            id='importFileNen'
            onClick={handleImportFileNen}
          >
            <a
              className='js-hs-unfold-invoker btn btn-icon btn-icon-head btn-ghost-secondary rounded-circle'
              href='javascript:;'
            >
              <img
                class='avatar avatar-xs avatar-4by3'
                style={{ width: '25px', height: '25px' }}
                src={Images.IMG_NEN_MAP}
                alt='Image Description'
              />
              <input id='filenen' type={'file'} className='d-none'></input>
            </a>
          </div>
          <div
            className='hs-unfold mr-2 '
            title='Import file nền bản đồ 2'
            id='importFileNen2'
            onClick={handleImportFileNen2}
          >
            <a
              className='js-hs-unfold-invoker btn btn-icon btn-icon-head btn-ghost-secondary rounded-circle'
              href='javascript:;'
            >
              <img
                class='avatar avatar-xs avatar-4by3'
                style={{ width: '25px', height: '25px' }}
                src={Images.IMG_NEN_MAP_2}
                alt='Image Description'
              />
              <input id='filenen2' type={'file'} className='d-none'></input>
            </a>
          </div>
          
          
          <div
            className='hs-unfold mr-2 '
            title='Thay đổi kiểu bản đồ'
            id='showModalChangeTypeMap'
          >
            <a className='js-hs-unfold-invoker btn-icon-head  btn btn-icon btn-ghost-secondary rounded-circle'>
              <img
                class='avatar avatar-xs avatar-4by3'
                style={{ width: '25px', height: '25px' }}
                src={Images.IMG_EARTH}
                alt='Image Description'
              />
            </a>
          </div>
          <div
            className='hs-unfold mr-2 '
            title='Thêm cột'
            id='showModalThemCot'
          >
            <a
              className='js-hs-unfold-invoker header-control btn btn-icon btn-ghost-secondary rounded-circle'
              data-attr='them_cot'
            >
              <img
                class='avatar avatar-xs avatar-4by3'
                style={{ width: '25px', height: '25px' }}
                src={Images.IMG_THEM_COT}
                alt='Thêm cột'
              />
            </a>
          </div>
          <div
            className='hs-unfold mr-2 '
            title='Sửa nhiều cột'
            id='showModalSuaNhieuCot'
          >
            <a
              className='js-hs-unfold-invoker header-control btn btn-icon btn-ghost-secondary rounded-circle'
              data-attr='sua_nhieu_cot'
            >
              <img
                class='avatar avatar-xs avatar-4by3'
                style={{ width: '25px', height: '25px' }}
                src={Images.IMG_SUA_NHIEU_COT}
                alt='Sửa nhiều cột'
              />
            </a>
          </div>
          <div
            className='hs-unfold mr-2 '
            title='Thêm đường'
            id='showModalThemDuong'
          >
            <a
              className='js-hs-unfold-invoker btn btn-icon header-control btn-ghost-secondary rounded-circle'
              data-attr='them_duong'
            >
              <img
                class='avatar avatar-xs avatar-4by3'
                style={{ width: '20px', height: '20px' }}
                src={Images.IMG_POLYLINE}
                alt='Thêm đường'
              />
            </a>
          </div>
          <div className='hs-unfold mr-2 ' title='Xuất ảnh' id='showImage'>
            <a className='js-hs-unfold-invoker btn btn-icon btn-ghost-secondary rounded-circle'>
              <img
                class='avatar avatar-xs avatar-4by3'
                style={{ width: '25px', height: '25px' }}
                src={Images.IMG_MAP}
                alt='Xuất ảnh'
              />
            </a>
          </div>
          <div
            className='hs-unfold mr-2 '
            title='Open Street Map'
            id='showImage'
          >
            <a
              className='js-hs-unfold-invoker btn btn-icon btn-ghost-secondary rounded-circle'
              onClick={exportOSM}
            >
              <img
                class='avatar avatar-xs avatar-4by3'
                style={{ width: '25px', height: '25px' }}
                src={Images.IMG_OSM}
                alt='Open Street Map'
              />
            </a>
          </div>
          <div className='hs-unfold mr-2 ' id='exportKML' title='Lưu lại'>
            <a className='js-hs-unfold-invoker btn btn-icon btn-ghost-secondary rounded-circle'>
              <img
                class='avatar avatar-xs avatar-4by3'
                style={{ width: '20px', height: '20px' }}
                src={Images.IMG_SAVE2}
                alt='Lưu lại'
              />
            </a>
          </div>
        </div>

        <div className='navbar-nav-wrap-content-right'>
          {/* Navbar */}
          <ul className='navbar-nav align-items-center flex-row'>
            {/* <li className='nav-item d-none d-sm-inline-block'> */}
            {/* Notification */}
            {/* <div className='hs-unfold'> */}
            {/* <a className='js-hs-unfold-invoker btn btn-icon btn-ghost-secondary rounded-circle'> */}
            {/* <i className='tio-notifications-on-outlined' /> */}
            {/* <span className='btn-status btn-sm-status btn-status-danger' /> */}
            {/* </a> */}
            {/* </div> */}
            {/* End Notification */}
            {/* </li> */}
            {/* <li className='nav-item d-none d-sm-inline-block'> */}
            {/* User */}
            {/* <div className='hs-unfold'> */}
            {/* <a className='js-hs-unfold-invoker navbar-dropdown-account-wrapper'> */}
            {/* <div className='avatar avatar-sm avatar-circle'> */}
            {/* <img
                      className='avatar-img'
                      src={imgUser}
                      alt='Image Description'
                    /> */}
            {/* <span className='avatar-status avatar-sm-status avatar-status-success' /> */}
            {/* </div> */}
            {/* </a> */}
            {/* </div> */}
            {/* End User */}
            {/* </li> */}
          </ul>
          {/* End Navbar */}
        </div>
        {/* End Secondary Content */}
      </div>
    </header>
  )
}
