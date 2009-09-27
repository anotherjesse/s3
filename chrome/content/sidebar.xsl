<?xml version="1.0" encoding="UTF-8"?>
<!--
     Copyright Jesse Andrews, 2005-2008
     http://overstimulate.com

     This file may be used under the terms of of the
     GNU General Public License Version 2 or later (the "GPL"),
     http://www.gnu.org/licenses/gpl.html

     Software distributed under the License is distributed on an "AS IS" basis,
     WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
     for the specific language governing rights and limitations under the
     License.
-->

<xsl:stylesheet version="1.0"
                xmlns:S3="http://s3.amazonaws.com/doc/2006-03-01/"
                xmlns="http://www.w3.org/1999/xhtml"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <xsl:template match="/">
    <ul class="jqueryFileTree">
      <xsl:for-each select="S3:ListBucketResult/S3:CommonPrefixes">
        <li class="directory">
          <a href="#">
            <xsl:attribute name="rel"><xsl:value-of select="S3:Prefix"/></xsl:attribute>
            <xsl:call-template name="getFileName">
              <xsl:with-param name="file" select="S3:Prefix"/>
            </xsl:call-template>
          </a>
        </li>
      </xsl:for-each>
      <xsl:for-each select="S3:ListBucketResult/S3:Contents">
        <li class="file">
          <xsl:attribute name="class">
            file
            <xsl:call-template name="getFileExtension">
              <xsl:with-param name="file" select="S3:Key"/>
            </xsl:call-template>
          </xsl:attribute>

          <a href="#">
            <xsl:attribute name="rel"><xsl:value-of select="S3:Key"/></xsl:attribute>
            <xsl:call-template name="getFileName">
              <xsl:with-param name="file" select="S3:Key"/>
            </xsl:call-template>
          </a>
        </li>
      </xsl:for-each>
    </ul>
  </xsl:template>

  <xsl:template name="getFileExtension">
    <xsl:param name="file"/>
    <xsl:if test="contains($file, '.')">
      <xsl:variable name="fileLength" select="string-length($file)"/>
      <xsl:variable name="delemiterPosition">
        <xsl:call-template name="getDelemiterPosition">
          <xsl:with-param name="file" select="$file"/>
          <xsl:with-param name="startSearchPosition" select="$fileLength"/>
        </xsl:call-template>
      </xsl:variable>
      <xsl:value-of select="concat('ext_', substring($file,
                            $delemiterPosition + 1,
                            $fileLength - $delemiterPosition + 1))"/>
    </xsl:if>
  </xsl:template>

  <xsl:template name="getDelemiterPosition">
    <xsl:param name="file"/>
    <xsl:param name="startSearchPosition"/>
    <xsl:if test="$startSearchPosition > 0">
      <xsl:choose>
        <xsl:when test="substring($file, $startSearchPosition, 1) = '.'">
          <xsl:value-of select="$startSearchPosition"/>
        </xsl:when>
        <xsl:otherwise>
          <xsl:call-template name="getDelemiterPosition">
            <xsl:with-param name="file" select="$file"/>
            <xsl:with-param name="startSearchPosition" select="$startSearchPosition - 1"/>
          </xsl:call-template>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:if>
  </xsl:template>

  <xsl:template name="getFileName">
    <xsl:param name="file"/>
    <xsl:variable name="fileLength" select="string-length($file)"/>
    <xsl:variable name="delemiterPosition">
      <xsl:call-template name="getFolderPosition">
        <xsl:with-param name="file" select="$file"/>
        <xsl:with-param name="location" select="$fileLength - 1"/>
      </xsl:call-template>
    </xsl:variable>
    <xsl:value-of select="substring($file,
                          $delemiterPosition + 1,
                          $fileLength - $delemiterPosition)"/>
  </xsl:template>

  <xsl:template name="getFolderPosition">
    <xsl:param name="file"/>
    <xsl:param name="location"/>
    <xsl:choose>
      <xsl:when test="$location > 0">
        <xsl:choose>
          <xsl:when test="substring($file, $location, 1) = '/'">
            <xsl:value-of select="$location"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:call-template name="getFolderPosition">
              <xsl:with-param name="file" select="$file"/>
              <xsl:with-param name="location" select="$location - 1"/>
            </xsl:call-template>
           </xsl:otherwise>
        </xsl:choose>
      </xsl:when>
      <xsl:otherwise>0</xsl:otherwise>
    </xsl:choose>
  </xsl:template>


</xsl:stylesheet>

