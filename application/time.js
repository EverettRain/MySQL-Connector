export const getBeijingISOStringWithZone = () => {
    const date = new Date();
    // 北京时间是 UTC+8，调整时间为北京时间
    const utcOffset = 8 * 60; // 8小时偏移量（分钟）
    const localTime = new Date(date.getTime() + (date.getTimezoneOffset() + utcOffset) * 60000);

    // 获取本地时间的各个部分
    const year = localTime.getFullYear();
    const month = String(localTime.getMonth() + 1).padStart(2, '0');
    const day = String(localTime.getDate()).padStart(2, '0');
    const hours = String(localTime.getHours()).padStart(2, '0');
    const minutes = String(localTime.getMinutes()).padStart(2, '0');
    const seconds = String(localTime.getSeconds()).padStart(2, '0');
    const milliseconds = String(localTime.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day} T${hours}:${minutes}:${seconds}.${milliseconds} (UTC+8)`;
};